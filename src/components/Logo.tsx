import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary rounded-lg blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <span className={`font-display font-bold tracking-tight ${sizes[size]}`}>
        Edit<span className="gradient-text">Vault</span>
      </span>
    </Link>
  );
}
