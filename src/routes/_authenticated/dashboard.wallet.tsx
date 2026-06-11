import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, Lock, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({ component: WalletPage });

function WalletPage() {
  const { user } = useAuth();
  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => (await supabase.from("wallets").select("*").eq("user_id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });
  const { data: tx = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => (await supabase.from("transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-1">Track locked, available and released funds.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WalletStat icon={Wallet} label="Available" value={wallet?.available_balance ?? 0} accent="success" />
        <WalletStat icon={Lock} label="Locked in escrow" value={wallet?.locked_balance ?? 0} accent="primary" />
        <WalletStat icon={ArrowUp} label="Total released" value={wallet?.released_total ?? 0} />
        <WalletStat icon={RefreshCw} label="Total refunded" value={wallet?.refunded_total ?? 0} />
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Transaction history</h2>
        {tx.length === 0 ? <div className="text-sm text-muted-foreground text-center py-8">No transactions yet.</div> : (
          <div className="divide-y divide-white/5">
            {tx.map((t: { id: string; type: string; amount: number; note: string | null; created_at: string }) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${Number(t.amount) >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                    {Number(t.amount) >= 0 ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium capitalize">{t.type}</div>
                    <div className="text-xs text-muted-foreground">{t.note} · {formatDistanceToNow(new Date(t.created_at))} ago</div>
                  </div>
                </div>
                <div className={`font-semibold font-display ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}>{Number(t.amount) >= 0 ? "+" : ""}${Number(t.amount).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WalletStat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent?: "success" | "primary" }) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      {accent && <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${accent === "primary" ? "bg-primary/20" : "bg-success/20"} blur-2xl`} />}
      <Icon className="w-5 h-5 text-muted-foreground mb-3 relative" />
      <div className="text-2xl md:text-3xl font-bold font-display relative">${Number(value).toFixed(2)}</div>
      <div className="text-xs text-muted-foreground mt-1 relative">{label}</div>
    </div>
  );
}
