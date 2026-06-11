import { type ReactNode, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FolderKanban, Wallet, Bell, Settings, LogOut, Menu, X, Sparkles, MessageSquare, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/dashboard/projects", icon: FolderKanban, label: "Projects" },
  { to: "/dashboard/messages", icon: MessageSquare, label: "Messages" },
  { to: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
  { to: "/dashboard/notifications", icon: Bell, label: "Notifications" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { profile, user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const isAdmin = roles.includes("admin");
  const nav = [...items, ...(isAdmin ? [{ to: "/dashboard/admin", icon: Shield, label: "Admin" }] : [])];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-full glass border-r border-white/5 flex flex-col">
          <div className="p-5 flex items-center justify-between">
            <Logo />
            <button className="lg:hidden" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {nav.map((it) => {
              const active = pathname === it.to || (it.to !== "/dashboard" && pathname.startsWith(it.to));
              return (
                <Link key={it.to} to={it.to} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${active ? "bg-gradient-primary text-white glow-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
                  <it.icon className="w-4 h-4" />{it.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="w-9 h-9"><AvatarImage src={profile?.avatar_url ?? undefined} /><AvatarFallback className="bg-gradient-primary text-white text-xs">{profile?.full_name?.[0] ?? user?.email?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{profile?.full_name ?? "Account"}</div>
                <div className="text-xs text-muted-foreground capitalize truncate">{roles.join(" · ")}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start mt-1" onClick={handleSignOut}><LogOut className="w-4 h-4" />Sign out</Button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 glass border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setOpen(true)}><Menu className="w-5 h-5" /></button>
          <Logo size="sm" />
          <div className="w-5" />
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
