import { Vault, User, Clapperboard } from "lucide-react";

export function VaultFlow() {
  return (
    <svg viewBox="0 0 600 200" className="w-full h-auto max-w-2xl mx-auto">
      <defs>
        <linearGradient id="flow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.58 0.25 295)" />
          <stop offset="100%" stopColor="oklch(0.70 0.23 0)" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <path d="M 100 100 Q 200 40, 300 100" stroke="url(#flow)" strokeWidth="3" fill="none" strokeDasharray="6 4" filter="url(#glow)" className="animate-flow" />
      <path d="M 300 100 Q 400 160, 500 100" stroke="url(#flow)" strokeWidth="3" fill="none" strokeDasharray="6 4" filter="url(#glow)" className="animate-flow" />
      <foreignObject x="60" y="60" width="80" height="80">
        <div className="glass rounded-2xl w-20 h-20 flex flex-col items-center justify-center text-xs">
          <User className="w-6 h-6 mb-1 text-primary" /><span>Client</span>
        </div>
      </foreignObject>
      <foreignObject x="260" y="60" width="80" height="80">
        <div className="glass rounded-2xl w-20 h-20 flex flex-col items-center justify-center text-xs animate-pulse-glow">
          <Vault className="w-7 h-7 mb-1 text-secondary" /><span>Escrow</span>
        </div>
      </foreignObject>
      <foreignObject x="460" y="60" width="80" height="80">
        <div className="glass rounded-2xl w-20 h-20 flex flex-col items-center justify-center text-xs">
          <Clapperboard className="w-6 h-6 mb-1 text-primary" /><span>Editor</span>
        </div>
      </foreignObject>
    </svg>
  );
}
