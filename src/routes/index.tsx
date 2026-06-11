import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, Zap, Trophy, Wallet, MessageCircle, Clock, CheckCircle2, Star, ArrowRight, Sparkles, Users, Video, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { VaultFlow } from "@/components/landing/VaultFlow";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroImg from "@/assets/hero-vault.jpg";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EditVault — Secure Escrow Payments for Video Editors & Clients" },
      { name: "description", content: "EditVault locks client funds in escrow until the editor delivers. Safe, on-time, automatic." },
      { property: "og:title", content: "EditVault — Secure Payments for Video Editors" },
      { property: "og:description", content: "Clients deposit upfront. Editors get paid automatically after delivery." },
    ],
  }),
  component: Landing,
});

function Nav() {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="glass rounded-2xl px-5 py-3 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="hero" size="sm"><Link to="/dashboard">Open dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button>
                <Button asChild variant="hero" size="sm"><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs text-muted-foreground mb-6">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            Trusted escrow for creators
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
            Secure Payments<br />for <span className="gradient-text">Video Editors.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Clients deposit funds upfront. Editors get paid automatically after successful delivery — or refunded if the deadline slips.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="xl">
              <Link to="/auth" search={{ mode: "signup", role: "client" }}>Start as Client <ArrowRight className="ml-1" /></Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <Link to="/auth" search={{ mode: "signup", role: "editor" }}>Start as Editor</Link>
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" /> Funds locked in escrow</div>
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-secondary" /> Auto refund on missed deadline</div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-10 bg-gradient-vault blur-3xl" />
          <img src={heroImg} alt="EditVault secure escrow vault illustration" width={1920} height={1080} className="relative rounded-2xl glass animate-float" />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Wallet, title: "Client deposits", desc: "Project budget locks into escrow before any work begins." },
    { icon: Video, title: "Editor delivers", desc: "Editor accepts the brief and uploads the finished edit before the deadline." },
    { icon: CheckCircle2, title: "Funds release", desc: "Client approves and payment lands in the editor's wallet instantly." },
  ];
  return (
    <section id="how" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">How <span className="gradient-text">EditVault</span> works</h2>
          <p className="mt-4 text-muted-foreground">A trusted middle layer between creators and clients, with funds moving only when both sides win.</p>
        </div>
        <VaultFlow />
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {steps.map((s, i) => (
            <div key={i} className="glass rounded-2xl p-8 group hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-5 group-hover:glow-pink transition-shadow">
                <s.icon className="w-6 h-6" />
              </div>
              <div className="text-xs text-muted-foreground font-mono mb-1">STEP {i + 1}</div>
              <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Lock, title: "Escrow-protected", desc: "Funds locked safely until delivery is approved." },
    { icon: Clock, title: "Auto deadlines", desc: "Missed deadlines trigger automatic refunds." },
    { icon: MessageCircle, title: "Built-in chat", desc: "Real-time messaging with file sharing." },
    { icon: Trophy, title: "Editor reputation", desc: "Badges and ratings build long-term trust." },
    { icon: Wallet, title: "Wallet system", desc: "Track locked, available, and released balances." },
    { icon: Zap, title: "Instant payouts", desc: "Earnings hit your wallet the second work is approved." },
  ];
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">Built for <span className="gradient-text">serious creators.</span></h2>
          <p className="mt-4 text-muted-foreground">Everything you need to collaborate, deliver and get paid — without the chase.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="glass rounded-2xl p-6 hover:bg-white/10 transition group">
              <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-gradient-primary transition">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const stats = [
    { v: "$2.4M+", l: "Funds escrowed" },
    { v: "12k+", l: "Projects completed" },
    { v: "98%", l: "On-time delivery" },
    { v: "4.9★", l: "Editor avg. rating" },
  ];
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="glass rounded-3xl p-10 md:p-16 bg-gradient-vault">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-4xl md:text-5xl font-bold">Why creators <span className="gradient-text">trust EditVault</span></h2>
            <p className="mt-4 text-muted-foreground">Bank-grade escrow, transparent rules, zero late payments.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold gradient-text font-display">{s.v}</div>
                <div className="text-sm text-muted-foreground mt-2">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { name: "Maya R.", role: "YouTuber, 1.2M subs", quote: "I've been burned by editors ghosting me mid-project. EditVault made my deposits actually safe." },
    { name: "Carlos D.", role: "Freelance editor", quote: "Knowing the money is already locked means I can focus on the edit, not on chasing invoices." },
    { name: "Liva Studio", role: "Content agency", quote: "We onboarded 14 contractors in a week. The escrow workflow just clicks." },
  ];
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">Loved by <span className="gradient-text">creators</span> worldwide</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">{Array.from({length:5}).map((_,j)=><Star key={j} className="w-4 h-4 fill-secondary text-secondary" />)}</div>
              <p className="text-sm leading-relaxed mb-5">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-semibold">{t.name[0]}</div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Starter", price: "0%", desc: "Pay-as-you-go", features: ["3% escrow fee", "Unlimited projects", "Basic chat", "Email support"], cta: "Start free" },
    { name: "Pro", price: "$19/mo", desc: "For active creators", features: ["1.5% escrow fee", "Priority support", "Custom branding", "Advanced analytics"], cta: "Start Pro", highlight: true },
    { name: "Agency", price: "Custom", desc: "Teams & studios", features: ["Lowest fees", "Multi-seat workspace", "Dedicated manager", "SLA & SSO"], cta: "Contact sales" },
  ];
  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">Simple, <span className="gradient-text">transparent pricing</span></h2>
          <p className="mt-4 text-muted-foreground">Only pay when projects complete successfully.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {tiers.map((t, i) => (
            <div key={i} className={`glass rounded-2xl p-8 ${t.highlight ? 'ring-2 ring-primary glow-primary' : ''}`}>
              {t.highlight && <div className="text-xs font-mono mb-3 gradient-text uppercase">Most popular</div>}
              <h3 className="text-xl font-semibold">{t.name}</h3>
              <div className="mt-4 mb-1 text-4xl font-bold font-display">{t.price}</div>
              <div className="text-sm text-muted-foreground mb-6">{t.desc}</div>
              <ul className="space-y-2.5 mb-8 text-sm">
                {t.features.map((f, j) => <li key={j} className="flex gap-2"><BadgeCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />{f}</li>)}
              </ul>
              <Button asChild variant={t.highlight ? "hero" : "outline"} className="w-full"><Link to="/auth" search={{ mode: "signup" }}>{t.cta}</Link></Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "How is my money kept safe?", a: "Funds are held in a dedicated escrow wallet and only released to the editor after you approve the delivery." },
    { q: "What if the editor misses the deadline?", a: "If no delivery is uploaded by the deadline, the funds are automatically refunded to your wallet." },
    { q: "Can I request revisions?", a: "Yes. Clients can request revisions before approving the delivery — funds stay locked until you're satisfied." },
    { q: "How do editors get paid?", a: "The moment a client approves the delivery, the locked amount moves to the editor's available wallet balance." },
    { q: "What payment methods are supported?", a: "MVP supports an in-app simulated wallet. Stripe, PayPal, JazzCash, EasyPaisa and bank transfers can be plugged in." },
  ];
  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">Frequently asked <span className="gradient-text">questions</span></h2>
        <Accordion type="single" collapsible className="glass rounded-2xl px-6">
          {items.map((it, i) => (
            <AccordionItem key={i} value={`i${i}`} className="border-white/10">
              <AccordionTrigger className="text-left">{it.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="glass rounded-3xl p-12 md:p-20 text-center bg-gradient-vault relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <Users className="w-12 h-12 mx-auto mb-6 text-secondary relative" />
          <h2 className="text-4xl md:text-6xl font-bold relative">Ready to <span className="gradient-text">work safely?</span></h2>
          <p className="mt-5 text-muted-foreground max-w-xl mx-auto relative">Join thousands of creators escrowing edits with EditVault.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 relative">
            <Button asChild variant="hero" size="xl"><Link to="/auth" search={{ mode: "signup", role: "client" }}>Start as Client</Link></Button>
            <Button asChild variant="glass" size="xl"><Link to="/auth" search={{ mode: "signup", role: "editor" }}>Start as Editor</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <Logo />
        <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} EditVault. Secure escrow for creators.</div>
        <div className="flex gap-5 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <HowItWorks />
      <Features />
      <Trust />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
