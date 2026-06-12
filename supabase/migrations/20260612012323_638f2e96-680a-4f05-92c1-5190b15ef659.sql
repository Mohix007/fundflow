
-- 1. Restrict has_role: only callable for self (or by admin checking others)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    -- Only allow checking other users' roles if caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
      RETURN false;
    END IF;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END; $$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 2. Projects: restrict select to participants/admin only (drop marketplace exposure)
DROP POLICY IF EXISTS "projects_select_participant" ON public.projects;
CREATE POLICY "projects_select_participant" ON public.projects FOR SELECT TO authenticated
USING (auth.uid() = client_id OR auth.uid() = editor_id OR public.has_role(auth.uid(),'admin'));

-- Marketplace view: safe columns only, for editors to browse open jobs
CREATE OR REPLACE VIEW public.marketplace_projects
WITH (security_invoker = true) AS
SELECT id, title, description, budget, deadline, status, created_at
FROM public.projects
WHERE status = 'funded' AND editor_id IS NULL;

-- Make the underlying rows readable for the view via a dedicated policy
CREATE POLICY "projects_select_marketplace" ON public.projects FOR SELECT TO authenticated
USING (status = 'funded' AND editor_id IS NULL);

-- Note: combined with projects_select_participant, marketplace rows expose all columns to
-- authenticated. Revoke direct column access by recreating a restricted policy set instead.
DROP POLICY "projects_select_marketplace" ON public.projects;

-- Use a SECURITY DEFINER view function path: grant select on the view via definer
GRANT SELECT ON public.marketplace_projects TO authenticated;

-- Recreate marketplace view as security definer so it bypasses RLS and only exposes safe cols
DROP VIEW public.marketplace_projects;
CREATE OR REPLACE FUNCTION public.list_marketplace_projects()
RETURNS TABLE (
  id uuid, title text, description text, budget numeric, deadline timestamptz,
  status project_status, created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, title, description, budget, deadline, status, created_at
  FROM public.projects
  WHERE status = 'funded' AND editor_id IS NULL
$$;
REVOKE EXECUTE ON FUNCTION public.list_marketplace_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_marketplace_projects() TO authenticated;

-- 3. Projects: split update into client and editor with column-locking trigger
DROP POLICY IF EXISTS "projects_update_participant" ON public.projects;
CREATE POLICY "projects_update_client" ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "projects_update_editor" ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = editor_id) WITH CHECK (auth.uid() = editor_id);
CREATE POLICY "projects_update_admin" ON public.projects FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.projects_guard_columns() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  -- Immutable for everyone but admin/service_role
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client_id is immutable';
  END IF;
  IF NEW.budget IS DISTINCT FROM OLD.budget THEN
    RAISE EXCEPTION 'budget cannot be changed';
  END IF;
  IF NEW.editor_id IS DISTINCT FROM OLD.editor_id AND auth.uid() <> OLD.client_id THEN
    RAISE EXCEPTION 'only client can change editor assignment';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'status changes must go through escrow server functions';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS projects_guard_columns ON public.projects;
CREATE TRIGGER projects_guard_columns BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_guard_columns();

-- 4. user_roles: explicit deny INSERT/UPDATE/DELETE for authenticated (privilege escalation prevention)
CREATE POLICY "user_roles_no_insert" ON public.user_roles AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "user_roles_no_update" ON public.user_roles AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "user_roles_no_delete" ON public.user_roles AS RESTRICTIVE
  FOR DELETE TO authenticated USING (false);

-- 5. reviews: validate participation and target
DROP POLICY IF EXISTS "reviews_insert_reviewer" ON public.reviews;
CREATE POLICY "reviews_insert_reviewer" ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.status = 'paid'
      AND (
        (p.client_id = auth.uid() AND p.editor_id = target_id)
        OR (p.editor_id = auth.uid() AND p.client_id = target_id)
      )
  )
);

-- 6. Realtime authorization for messages channel
-- Channel topic convention: "project:<project_id>"
CREATE POLICY "messages_realtime_participant" ON realtime.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE 'project:' || p.id::text = realtime.topic()
      AND (p.client_id = auth.uid() OR p.editor_id = auth.uid())
  )
);
