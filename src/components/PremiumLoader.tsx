import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

export function PremiumLoader() {
  const [phase, setPhase] = useState(0); // 0=visible 1=fading 2=gone
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 18, 95));
    }, 80);
    const t1 = setTimeout(() => { setProgress(100); clearInterval(interval); }, 550);
    const t2 = setTimeout(() => setPhase(1), 750);
    const t3 = setTimeout(() => setPhase(2), 1250);
    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (phase === 2) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === 1 ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl" style={{ background: "oklch(0.72 0.20 50 / 0.12)" }} />
        <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full blur-3xl" style={{ background: "oklch(0.68 0.22 35 / 0.10)" }} />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Spinning ring only — no inner box */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* Outer glow */}
          <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: "var(--gradient-accent)", opacity: 0.3 }} />
          {/* Spinning gradient ring */}
          <svg className="absolute inset-0 animate-spin" style={{ animationDuration: "1.4s" }} viewBox="0 0 100 100">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e07b2e" stopOpacity="0" />
                <stop offset="50%" stopColor="#e07b2e" stopOpacity="1" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="url(#ringGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="200 76" />
          </svg>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <p className="text-xl font-bold tracking-tight">Social Padu</p>
          <p className="mt-1 text-xs text-muted-foreground tracking-widest uppercase">Loading your experience</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 overflow-hidden rounded-full bg-border/40" style={{ height: 3 }}>
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${progress}%`, background: "var(--gradient-accent)" }}
          />
        </div>
      </div>
    </div>
  );
}
