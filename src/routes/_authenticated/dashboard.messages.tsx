import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const Route = createFileRoute("/_authenticated/dashboard/messages")({ component: MessagesPage });

function MessagesPage() {
  const { user, roles } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["msg-projects", user?.id],
    queryFn: async () => {
      const col = roles.includes("editor") ? "editor_id" : "client_id";
      const { data } = await supabase.from("projects").select("id, title, status, updated_at").eq(col, user!.id).order("updated_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-1">Conversations are organised per project.</p>
      </div>
      <div className="glass rounded-2xl">
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No active projects yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {projects.map((p: { id: string; title: string; status: string }) => (
              <Link key={p.id} to="/dashboard/projects/$id" params={{ id: p.id }} className="flex items-center justify-between p-5 hover:bg-white/5 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center"><MessageSquare className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">Open project chat</div>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
