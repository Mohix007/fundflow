import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { fundEscrow, acceptProject, submitDelivery, approveDelivery, requestRevision, refundProject } from "@/lib/escrow.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Lock, Upload, CheckCircle2, RefreshCw, Clock, FileText, Send, ArrowLeft, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/projects/$id")({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = useParams({ from: "/_authenticated/dashboard/projects/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: project, refetch } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: client } = useQuery({
    queryKey: ["profile", project?.client_id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", project!.client_id).maybeSingle()).data,
    enabled: !!project?.client_id,
  });
  const { data: editor } = useQuery({
    queryKey: ["profile", project?.editor_id],
    queryFn: async () => project?.editor_id ? (await supabase.from("profiles").select("*").eq("id", project.editor_id).maybeSingle()).data : null,
    enabled: !!project?.editor_id,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries", id],
    queryFn: async () => (await supabase.from("deliveries").select("*").eq("project_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const fund = useServerFn(fundEscrow);
  const accept = useServerFn(acceptProject);
  const submit = useServerFn(submitDelivery);
  const approve = useServerFn(approveDelivery);
  const revise = useServerFn(requestRevision);
  const refund = useServerFn(refundProject);

  const [deliverUrl, setDeliverUrl] = useState("");
  const [deliverNotes, setDeliverNotes] = useState("");
  const [revisionNote, setRevisionNote] = useState("");

  if (!project) return <div className="text-center py-12 text-muted-foreground">Loading project...</div>;

  const isClient = user?.id === project.client_id;
  const isEditor = user?.id === project.editor_id;
  const overdue = new Date(project.deadline) < new Date();

  const action = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); refetch(); qc.invalidateQueries({ queryKey: ["wallet"] }); qc.invalidateQueries({ queryKey: ["deliveries"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <Link to="/dashboard/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" />All projects</Link>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap"><StatusBadge status={project.status} />{overdue && project.status !== "paid" && project.status !== "refunded" && <span className="text-xs text-destructive">⚠️ Past deadline</span>}</div>
            <h1 className="text-3xl md:text-4xl font-bold">{project.title}</h1>
            {project.description && <p className="text-muted-foreground mt-3 whitespace-pre-wrap">{project.description}</p>}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold font-display gradient-text">${Number(project.budget).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">Due {formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}</div>
          </div>
        </div>
        {project.brief_url && <a href={project.brief_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"><FileText className="w-4 h-4" />Open brief</a>}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Actions */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Lock className="w-4 h-4" />Escrow actions</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {isClient && project.status === "awaiting_deposit" && (
                <Button variant="hero" onClick={() => action(() => fund({ data: { projectId: id } }), "Funds locked in escrow")}><Lock />Fund escrow ${Number(project.budget).toFixed(2)}</Button>
              )}
              {isClient && (project.status === "delivered" || project.status === "revision_requested") && (
                <>
                  <Button variant="success" onClick={() => action(() => approve({ data: { projectId: id } }), "Funds released to editor")}><CheckCircle2 />Approve & release</Button>
                </>
              )}
              {isClient && overdue && !["paid","refunded"].includes(project.status) && (
                <Button variant="destructive" onClick={() => action(() => refund({ data: { projectId: id } }), "Refund issued")}><RefreshCw />Request refund</Button>
              )}
              {!isClient && !isEditor && project.status === "funded" && !project.editor_id && (
                <Button variant="hero" onClick={() => action(() => accept({ data: { projectId: id } }), "Project accepted")}><CheckCircle2 />Accept project</Button>
              )}
              {!isClient && !isEditor && project.status !== "funded" && (
                <div className="text-sm text-muted-foreground">Only the participants can take actions.</div>
              )}
            </div>

            {isClient && project.status === "delivered" && (
              <div className="mt-5 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Request a revision</div>
                <Textarea rows={2} placeholder="What needs to change?" value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} className="bg-white/5" />
                <Button variant="outline" disabled={!revisionNote} onClick={() => action(() => revise({ data: { projectId: id, note: revisionNote } }).then(() => setRevisionNote("")), "Revision requested")}><RefreshCw />Send revision request</Button>
              </div>
            )}

            {isEditor && (project.status === "in_progress" || project.status === "revision_requested") && (
              <div className="mt-5 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Upload delivery</div>
                <Input placeholder="Delivery URL (Drive, Frame.io, etc.)" value={deliverUrl} onChange={(e) => setDeliverUrl(e.target.value)} className="bg-white/5" />
                <Textarea rows={2} placeholder="Notes for the client (optional)" value={deliverNotes} onChange={(e) => setDeliverNotes(e.target.value)} className="bg-white/5" />
                <Button variant="hero" disabled={!deliverUrl} onClick={() => action(() => submit({ data: { projectId: id, fileUrl: deliverUrl, notes: deliverNotes || undefined } }).then(() => { setDeliverUrl(""); setDeliverNotes(""); }), "Delivery uploaded")}><Upload />Submit delivery</Button>
              </div>
            )}
          </div>

          {/* Deliveries */}
          {deliveries.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="font-semibold mb-4">Deliveries</h2>
              <div className="space-y-3">
                {deliveries.map((d: { id: string; file_url: string; notes: string | null; created_at: string }) => (
                  <div key={d.id} className="border border-white/5 rounded-xl p-4">
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium break-all">{d.file_url}</a>
                    {d.notes && <p className="text-sm text-muted-foreground mt-2">{d.notes}</p>}
                    <div className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(d.created_at))} ago</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat */}
          {(isClient || isEditor) && <ProjectChat projectId={id} />}
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Client</div>
            <UserCard p={client} />
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Editor</div>
            {editor ? <UserCard p={editor} /> : <div className="text-sm text-muted-foreground">Unassigned</div>}
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Timeline</div>
            <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-secondary" />Created {formatDistanceToNow(new Date(project.created_at))} ago</div>
            <div className="flex items-center gap-2 text-sm mt-2"><Clock className="w-4 h-4 text-secondary" />Deadline {new Date(project.deadline).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserCard({ p }: { p: { full_name: string | null; avatar_url: string | null; headline: string | null; reputation_score: number; completed_projects: number } | null | undefined }) {
  if (!p) return <div className="text-sm text-muted-foreground">—</div>;
  return (
    <div className="flex items-center gap-3">
      <Avatar><AvatarFallback className="bg-gradient-primary text-white">{p.full_name?.[0] ?? "?"}</AvatarFallback></Avatar>
      <div className="min-w-0">
        <div className="font-medium truncate">{p.full_name ?? "Unnamed"}</div>
        <div className="text-xs text-muted-foreground">{p.completed_projects} projects · ⭐ {Number(p.reputation_score).toFixed(0)}</div>
      </div>
    </div>
  );
}

function ProjectChat({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const { data: messages = [], refetch } = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => (await supabase.from("messages").select("*").eq("project_id", projectId).order("created_at", { ascending: true })).data ?? [],
  });

  useEffect(() => {
    const ch = supabase.channel(`messages:${projectId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, refetch]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body; setBody("");
    const { error } = await supabase.from("messages").insert({ project_id: projectId, sender_id: user!.id, body: text });
    if (error) { toast.error(error.message); setBody(text); }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" />Project chat</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
        {messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation 👇</div>}
        {messages.map((m: { id: string; sender_id: string; body: string; created_at: string }) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-gradient-primary text-white" : "bg-white/5"}`}>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className="text-[10px] opacity-60 mt-1">{formatDistanceToNow(new Date(m.created_at))} ago</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message..." className="bg-white/5" />
        <Button type="submit" variant="hero"><Send /></Button>
      </form>
    </div>
  );
}
