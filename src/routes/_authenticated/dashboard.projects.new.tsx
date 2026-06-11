import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/projects/new")({
  component: NewProject,
});

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  budget: z.number().positive().max(1_000_000),
  deadline: z.string().refine((s) => new Date(s) > new Date(), "Must be in the future"),
  brief_url: z.string().url().optional().or(z.literal("")),
});

function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", budget: 100, deadline: "", brief_url: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.from("projects").insert({
      client_id: user!.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      budget: parsed.data.budget,
      deadline: parsed.data.deadline,
      brief_url: parsed.data.brief_url || null,
      status: "awaiting_deposit",
    }).select().single();
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Project created. Fund the escrow to make it visible to editors.");
    navigate({ to: "/dashboard/projects/$id", params: { id: data.id } });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl md:text-4xl font-bold">New Project</h1>
      <p className="text-muted-foreground mt-1">Describe the work, set a budget and deadline. Funds lock into escrow on the next step.</p>

      <form onSubmit={submit} className="glass rounded-2xl p-6 mt-6 space-y-5">
        <div>
          <Label htmlFor="title">Project title *</Label>
          <Input id="title" required value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} className="mt-1 bg-white/5" placeholder="YouTube vlog edit — 8 minutes" />
        </div>
        <div>
          <Label htmlFor="desc">Brief / description</Label>
          <Textarea id="desc" rows={5} value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} className="mt-1 bg-white/5" placeholder="Style references, pacing, music vibe, deliverables..." />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="budget">Budget (USD) *</Label>
            <Input id="budget" type="number" min={1} step="0.01" required value={form.budget} onChange={(e)=>setForm({...form, budget: Number(e.target.value)})} className="mt-1 bg-white/5" />
          </div>
          <div>
            <Label htmlFor="deadline">Deadline *</Label>
            <Input id="deadline" type="datetime-local" required value={form.deadline} onChange={(e)=>setForm({...form, deadline: e.target.value})} className="mt-1 bg-white/5" />
          </div>
        </div>
        <div>
          <Label htmlFor="brief">Brief URL (Drive, Notion, etc.)</Label>
          <Input id="brief" type="url" value={form.brief_url} onChange={(e)=>setForm({...form, brief_url: e.target.value})} className="mt-1 bg-white/5" placeholder="https://..." />
        </div>
        <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full">
          {loading ? <Loader2 className="animate-spin" /> : <><Sparkles />Create project</>}
        </Button>
      </form>
    </div>
  );
}
