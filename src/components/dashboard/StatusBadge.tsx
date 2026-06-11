import { cn } from "@/lib/utils";

const map: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-white/10 text-muted-foreground" },
  awaiting_deposit: { label: "Awaiting Deposit", cls: "bg-warning/20 text-warning" },
  funded: { label: "Funded", cls: "bg-primary/20 text-primary" },
  in_progress: { label: "In Progress", cls: "bg-secondary/20 text-secondary" },
  delivered: { label: "Delivered", cls: "bg-blue-500/20 text-blue-300" },
  revision_requested: { label: "Revisions", cls: "bg-warning/20 text-warning" },
  approved: { label: "Approved", cls: "bg-success/20 text-success" },
  paid: { label: "Paid", cls: "bg-success/20 text-success" },
  refunded: { label: "Refunded", cls: "bg-destructive/20 text-destructive" },
  disputed: { label: "Disputed", cls: "bg-destructive/20 text-destructive" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = map[status] ?? { label: status, cls: "bg-white/10" };
  return <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", m.cls)}>{m.label}</span>;
}
