import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/projects")({
  component: ProjectsLayout,
});

function ProjectsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/dashboard/projects") return <Outlet />;
  return <ProjectsList />;
}

function ProjectsList() {
  const { user, roles } = useAuth();
  const isEditor = roles.includes("editor");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"mine" | "marketplace">("mine");

  const { data: mine = [] } = useQuery({
    queryKey: ["projects", "mine", user?.id, isEditor],
    queryFn: async () => {
      const col = isEditor ? "editor_id" : "client_id";
      const { data } = await supabase.from("projects").select("*").eq(col, user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: market = [] } = useQuery({
    queryKey: ["projects", "marketplace"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("status", "funded").is("editor_id", null).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isEditor,
  });

  const list = (tab === "mine" ? mine : market).filter((p: { title: string }) =>
    p.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage all your escrow-protected edits.</p>
        </div>
        {!isEditor && <Button asChild variant="hero"><Link to="/dashboard/projects/new"><Plus />New Project</Link></Button>}
      </div>

      {isEditor && (
        <div className="flex gap-2">
          <button onClick={() => setTab("mine")} className={`px-4 py-2 rounded-lg text-sm ${tab==="mine"?"bg-gradient-primary glow-primary":"glass"}`}>My projects</button>
          <button onClick={() => setTab("marketplace")} className={`px-4 py-2 rounded-lg text-sm ${tab==="marketplace"?"bg-gradient-primary glow-primary":"glass"}`}>Open marketplace ({market.length})</button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 bg-white/5" placeholder="Search projects..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>

      <div className="grid gap-4">
        {list.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">No projects {q && "match your search"}.</p>
          </div>
        ) : (
          list.map((p: { id: string; title: string; description: string | null; budget: number; deadline: string; status: string; created_at: string }) => (
            <Link key={p.id} to="/dashboard/projects/$id" params={{ id: p.id }} className="glass rounded-2xl p-5 hover:bg-white/10 transition group">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg truncate group-hover:gradient-text">{p.title}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                    <span>💰 ${Number(p.budget).toFixed(2)}</span>
                    <span>⏰ Due {formatDistanceToNow(new Date(p.deadline))}</span>
                    <span>📅 Created {formatDistanceToNow(new Date(p.created_at))} ago</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
