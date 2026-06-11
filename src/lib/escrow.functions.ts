import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const idInput = z.object({ projectId: z.string().uuid() });

/** Client funds escrow. Simulated wallet: increments client locked_balance and project -> funded. */
export const fundEscrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error: pe } = await supabase.from("projects").select("*").eq("id", data.projectId).single();
    if (pe || !project) throw new Error("Project not found");
    if (project.client_id !== userId) throw new Error("Only the client can fund this project");
    if (!["draft", "awaiting_deposit"].includes(project.status)) throw new Error("Project is not awaiting deposit");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // ensure wallet exists
    await supabaseAdmin.from("wallets").upsert({ user_id: userId }, { onConflict: "user_id" });
    const { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single();
    await supabaseAdmin.from("wallets").update({
      locked_balance: Number(wallet!.locked_balance) + Number(project.budget),
    }).eq("user_id", userId);
    await supabaseAdmin.from("projects").update({ status: "funded" }).eq("id", project.id);
    await supabaseAdmin.from("transactions").insert({
      project_id: project.id, user_id: userId, type: "deposit", amount: project.budget, note: "Escrow deposit",
    });
    await supabaseAdmin.from("notifications").insert({
      user_id: userId, type: "deposit", title: "Funds deposited", body: `$${project.budget} locked in escrow for "${project.title}".`, link: `/dashboard/projects/${project.id}`,
    });
    return { ok: true };
  });

/** Editor accepts an open project. */
export const acceptProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", data.projectId).single();
    if (error || !project) throw new Error("Project not found");
    if (project.status !== "funded") throw new Error("Project is not open for acceptance");
    if (project.editor_id) throw new Error("Already accepted");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("projects").update({ editor_id: userId, status: "in_progress" }).eq("id", project.id);
    await supabaseAdmin.from("notifications").insert([
      { user_id: project.client_id, type: "accepted", title: "Editor accepted", body: `Your project "${project.title}" has an editor.`, link: `/dashboard/projects/${project.id}` },
      { user_id: userId, type: "accepted", title: "Project accepted", body: `You're working on "${project.title}".`, link: `/dashboard/projects/${project.id}` },
    ]);
    return { ok: true };
  });

/** Editor submits delivery. */
export const submitDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid(), fileUrl: z.string().url(), notes: z.string().max(2000).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", data.projectId).single();
    if (error || !project) throw new Error("Project not found");
    if (project.editor_id !== userId) throw new Error("Only the assigned editor can deliver");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("deliveries").insert({ project_id: project.id, editor_id: userId, file_url: data.fileUrl, notes: data.notes ?? null });
    await supabaseAdmin.from("projects").update({ status: "delivered" }).eq("id", project.id);
    await supabaseAdmin.from("notifications").insert({
      user_id: project.client_id, type: "delivery", title: "Delivery uploaded", body: `New delivery for "${project.title}". Review and approve.`, link: `/dashboard/projects/${project.id}`,
    });
    return { ok: true };
  });

/** Client approves -> release funds to editor. */
export const approveDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", data.projectId).single();
    if (error || !project) throw new Error("Project not found");
    if (project.client_id !== userId) throw new Error("Only the client can approve");
    if (project.status !== "delivered" && project.status !== "revision_requested") throw new Error("Nothing to approve");
    if (!project.editor_id) throw new Error("No editor assigned");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // ensure editor wallet
    await supabaseAdmin.from("wallets").upsert({ user_id: project.editor_id }, { onConflict: "user_id" });
    const [{ data: cw }, { data: ew }] = await Promise.all([
      supabaseAdmin.from("wallets").select("*").eq("user_id", project.client_id).single(),
      supabaseAdmin.from("wallets").select("*").eq("user_id", project.editor_id).single(),
    ]);
    const amount = Number(project.budget);
    await supabaseAdmin.from("wallets").update({ locked_balance: Math.max(0, Number(cw!.locked_balance) - amount) }).eq("user_id", project.client_id);
    await supabaseAdmin.from("wallets").update({
      available_balance: Number(ew!.available_balance) + amount,
      released_total: Number(ew!.released_total) + amount,
    }).eq("user_id", project.editor_id);
    await supabaseAdmin.from("projects").update({ status: "paid" }).eq("id", project.id);
    await supabaseAdmin.from("transactions").insert([
      { project_id: project.id, user_id: project.client_id, type: "release", amount: -amount, note: "Released to editor" },
      { project_id: project.id, user_id: project.editor_id, type: "release", amount, note: "Payment received" },
    ]);
    await supabaseAdmin.from("notifications").insert([
      { user_id: project.editor_id, type: "payment", title: "You got paid", body: `$${amount} released for "${project.title}".`, link: `/dashboard/projects/${project.id}` },
      { user_id: project.client_id, type: "payment", title: "Project complete", body: `"${project.title}" marked complete.`, link: `/dashboard/projects/${project.id}` },
    ]);
    // bump editor reputation
    const { data: ep } = await supabaseAdmin.from("profiles").select("completed_projects, reputation_score").eq("id", project.editor_id).single();
    await supabaseAdmin.from("profiles").update({
      completed_projects: (ep?.completed_projects ?? 0) + 1,
      reputation_score: Number(ep?.reputation_score ?? 0) + 5,
    }).eq("id", project.editor_id);
    return { ok: true };
  });

export const requestRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid(), note: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", data.projectId).single();
    if (error || !project) throw new Error("Project not found");
    if (project.client_id !== userId) throw new Error("Only the client can request revisions");
    if (project.status !== "delivered") throw new Error("No delivery to revise");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("projects").update({ status: "revision_requested" }).eq("id", project.id);
    await supabaseAdmin.from("messages").insert({ project_id: project.id, sender_id: userId, body: `🔁 Revision requested: ${data.note}` });
    if (project.editor_id) {
      await supabaseAdmin.from("notifications").insert({ user_id: project.editor_id, type: "revision", title: "Revision requested", body: data.note, link: `/dashboard/projects/${project.id}` });
    }
    return { ok: true };
  });

export const refundProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", data.projectId).single();
    if (error || !project) throw new Error("Project not found");
    if (project.client_id !== userId) throw new Error("Only the client can request refund");
    if (new Date(project.deadline) > new Date() && project.status !== "disputed") {
      throw new Error("Deadline hasn't passed yet");
    }
    if (["paid","refunded"].includes(project.status)) throw new Error("Already settled");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cw } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId).single();
    const amount = Number(project.budget);
    await supabaseAdmin.from("wallets").update({
      locked_balance: Math.max(0, Number(cw!.locked_balance) - amount),
      available_balance: Number(cw!.available_balance) + amount,
      refunded_total: Number(cw!.refunded_total) + amount,
    }).eq("user_id", userId);
    await supabaseAdmin.from("projects").update({ status: "refunded" }).eq("id", project.id);
    await supabaseAdmin.from("transactions").insert({ project_id: project.id, user_id: userId, type: "refund", amount, note: "Auto refund" });
    await supabaseAdmin.from("notifications").insert({ user_id: userId, type: "refund", title: "Refund issued", body: `$${amount} returned for "${project.title}".`, link: `/dashboard/projects/${project.id}` });
    return { ok: true };
  });
