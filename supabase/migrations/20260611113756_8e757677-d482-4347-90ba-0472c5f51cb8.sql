
-- Enums
CREATE TYPE public.app_role AS ENUM ('client', 'editor', 'admin');
CREATE TYPE public.project_status AS ENUM ('draft','awaiting_deposit','funded','in_progress','delivered','revision_requested','approved','paid','refunded','disputed');
CREATE TYPE public.tx_type AS ENUM ('deposit','release','refund','adjustment');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  headline TEXT,
  reputation_score NUMERIC NOT NULL DEFAULT 0,
  completed_projects INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- wallets
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  locked_balance NUMERIC NOT NULL DEFAULT 0,
  released_total NUMERIC NOT NULL DEFAULT 0,
  refunded_total NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER touch_wallets BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  brief_url TEXT,
  reference_urls TEXT[] DEFAULT '{}',
  budget NUMERIC NOT NULL CHECK (budget >= 0),
  deadline TIMESTAMPTZ NOT NULL,
  status project_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_participant" ON public.projects FOR SELECT TO authenticated
USING (auth.uid() = client_id OR auth.uid() = editor_id OR status IN ('awaiting_deposit','funded') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "projects_insert_client" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "projects_update_participant" ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = client_id OR auth.uid() = editor_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "projects_delete_client_draft" ON public.projects FOR DELETE TO authenticated
USING (auth.uid() = client_id AND status = 'draft');
CREATE TRIGGER touch_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type tx_type NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_select_own" ON public.transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- deliveries
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries_select_participant" ON public.deliveries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.editor_id = auth.uid()))
);
CREATE POLICY "deliveries_insert_editor" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = editor_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.editor_id = auth.uid())
);

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_participant" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.editor_id = auth.uid()))
);
CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.editor_id = auth.uid()))
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews_insert_reviewer" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- disputes
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disputes_select_participant" ON public.disputes FOR SELECT TO authenticated USING (
  auth.uid() = opened_by OR public.has_role(auth.uid(),'admin') OR
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.editor_id = auth.uid()))
);
CREATE POLICY "disputes_insert_participant" ON public.disputes FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = opened_by AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.client_id = auth.uid() OR p.editor_id = auth.uid()))
);

-- New-user bootstrap: profile + wallet
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  -- Default role: client. App can add editor role via choose-role action.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
