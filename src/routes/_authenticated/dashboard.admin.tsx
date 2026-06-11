import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, FolderKanban, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({ component: AdminPage });

function AdminPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ count: users }, { count: projects }, { data: tx }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("amount,type"),
      ]);
      const escrowed = (tx ?? []).filter((t) => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
      return { users, projects, escrowed };
    },
    enabled: isAdmin,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => (await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
    enabled: isAdmin,
  });

  if (!isAdmin) return <div className="glass rounded-2xl p-12 text-center"><p>Admin access only.</p></div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-3xl md:text-4xl font-bold">Admin</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5"><Users className="w-5 h-5 mb-3 text-primary" /><div className="text-3xl font-bold font-display">{stats?.users ?? 0}</div><div className="text-xs text-muted-foreground">Users</div></div>
        <div className="glass rounded-2xl p-5"><FolderKanban className="w-5 h-5 mb-3 text-secondary" /><div className="text-3xl font-bold font-display">{stats?.projects ?? 0}</div><div className="text-xs text-muted-foreground">Projects</div></div>
        <div className="glass rounded-2xl p-5"><Wallet className="w-5 h-5 mb-3 text-success" /><div className="text-3xl font-bold font-display gradient-text">${Number(stats?.escrowed ?? 0).toFixed(0)}</div><div className="text-xs text-muted-foreground">Escrowed (gross)</div></div>
      </div>
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Recent projects</h2>
        <div className="divide-y divide-white/5">
          {projects.map((p: { id: string; title: string; status: string; budget: number }) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div className="min-w-0"><div className="font-medium truncate">{p.title}</div><div className="text-xs text-muted-foreground">${Number(p.budget).toFixed(2)}</div></div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
