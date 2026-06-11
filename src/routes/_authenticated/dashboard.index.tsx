import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, TrendingUp, Wallet, Clock, CheckCircle2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

function Overview() {
  const { user, profile, roles } = useAuth();
  const isEditor = roles.includes("editor");

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["overview-projects", user?.id],
    queryFn: async () => {
      const col = isEditor ? "editor_id" : "client_id";
      const { data } = await supabase.from("projects").select("*").eq(col, user!.id).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const active = projects.filter((p: { status: string }) => !["paid","refunded","draft"].includes(p.status)).length;
  const completed = projects.filter((p: { status: string }) => p.status === "paid").length;

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Welcome back</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">{profile?.full_name ?? "Creator"} 👋</h1>
        </div>
        <Button asChild variant="hero"><Link to="/dashboard/projects/new"><Plus />New Project</Link></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Available" value={`$${Number(wallet?.available_balance ?? 0).toFixed(2)}`} accent="primary" />
        <StatCard icon={Clock} label="Locked in escrow" value={`$${Number(wallet?.locked_balance ?? 0).toFixed(2)}`} accent="secondary" />
        <StatCard icon={TrendingUp} label="Active projects" value={String(active)} />
        <StatCard icon={CheckCircle2} label="Completed" value={String(completed)} />
      </div>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Recent projects</h2>
          <Link to="/dashboard/projects" className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center glow-primary"><Plus /></div>
            <p className="text-muted-foreground">No projects yet</p>
            <Button asChild variant="hero" className="mt-4"><Link to="/dashboard/projects/new">Create your first project</Link></Button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {projects.map((p: { id: string; title: string; budget: number; status: string; created_at: string }) => (
              <Link key={p.id} to="/dashboard/projects/$id" params={{ id: p.id }} className="flex items-center justify-between py-4 hover:bg-white/5 -mx-2 px-2 rounded-lg transition">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground">Created {formatDistanceToNow(new Date(p.created_at))} ago · ${Number(p.budget).toFixed(2)}</div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: "primary" | "secondary" }) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden group">
      {accent && <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${accent === "primary" ? "bg-primary/20" : "bg-secondary/20"} blur-2xl`} />}
      <div className="relative">
        <Icon className="w-5 h-5 text-muted-foreground mb-3" />
        <div className="text-2xl md:text-3xl font-bold font-display">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}
