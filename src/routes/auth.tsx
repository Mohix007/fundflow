import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Lock, User as UserIcon, Loader2, Vault, Clapperboard } from "lucide-react";

const search = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["client", "editor"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — EditVault" }, { name: "description", content: "Sign in or create your EditVault account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sp = Route.useSearch();
  const [tab, setTab] = useState<"signin" | "signup">(sp.mode ?? "signin");
  const [role, setRole] = useState<"client" | "editor">(sp.role ?? "client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        if (role === "editor" && data.user) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "editor" });
        }
        toast.success("Welcome to EditVault!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) { toast.error(result.error.message); setLoading(false); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-gradient-vault pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo size="lg" /></div>
        <div className="glass rounded-2xl p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full mb-6 bg-white/5">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">I am a...</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setRole("client")} className={`glass rounded-xl p-3 text-left transition ${role==="client"?"ring-2 ring-primary glow-primary":""}`}>
                    <Vault className="w-5 h-5 mb-1 text-primary" />
                    <div className="text-sm font-semibold">Client</div>
                    <div className="text-xs text-muted-foreground">I hire editors</div>
                  </button>
                  <button type="button" onClick={() => setRole("editor")} className={`glass rounded-xl p-3 text-left transition ${role==="editor"?"ring-2 ring-secondary glow-pink":""}`}>
                    <Clapperboard className="w-5 h-5 mb-1 text-secondary" />
                    <div className="text-sm font-semibold">Editor</div>
                    <div className="text-xs text-muted-foreground">I edit videos</div>
                  </button>
                </div>
              </div>
            </TabsContent>

            <form onSubmit={handleEmail} className="space-y-4 mt-2">
              {tab === "signup" && (
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <div className="relative mt-1">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" required value={name} onChange={(e)=>setName(e.target.value)} className="pl-9 bg-white/5" placeholder="Jane Creator" />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="pl-9 bg-white/5" placeholder="you@studio.com" />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} className="pl-9 bg-white/5" placeholder="••••••••" />
                </div>
              </div>
              <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : tab === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">or</span></div>
            </div>

            <Button variant="outline" className="w-full" size="lg" onClick={handleGoogle} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .5 4.1 1.6L19 3.7C17.1 1.9 14.7 1 12 1 7.4 1 3.5 3.6 1.6 7.5L5 10.2C5.9 7.3 8.7 5 12 5z"/><path fill="#4285F4" d="M23 12c0-.8-.1-1.6-.2-2.4H12v4.6h6.2c-.3 1.5-1.1 2.7-2.4 3.6l3.7 2.9c2.2-2 3.5-5 3.5-8.7z"/><path fill="#FBBC04" d="M5 13.8c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2L1.6 6.7C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.3L5 14.2z"/><path fill="#34A853" d="M12 23c3.2 0 5.9-1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.2 1.1-3.3 0-6.1-2.2-7-5.1L1.6 16C3.5 20 7.4 23 12 23z"/></svg>
              Continue with Google
            </Button>
          </Tabs>
        </div>
        <div className="text-center mt-6"><Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link></div>
      </div>
    </div>
  );
}
