import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">Real-time updates on your projects.</p>
        </div>
        {items.some((i: { read: boolean }) => !i.read) && <Button variant="outline" onClick={markAll}><Check />Mark all read</Button>}
      </div>
      <div className="glass rounded-2xl p-2">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">All caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((n: { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string }) => {
              const inner = (
                <div className={`p-4 rounded-xl ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0 glow-pink" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{n.title}</div>
                      {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
                      <div className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at))} ago</div>
                    </div>
                  </div>
                </div>
              );
              return n.link ? <a key={n.id} href={n.link} className="block hover:bg-white/5 rounded-xl">{inner}</a> : <div key={n.id}>{inner}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
