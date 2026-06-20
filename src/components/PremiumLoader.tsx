import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";

/**
 * Full-screen premium loader shown on first paint only.
 * Fades out after the app is hydrated.
 */
export function PremiumLoader() {
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHidden(true), 700);
    const t2 = setTimeout(() => setGone(true), 1300);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ background: "var(--gradient-hero), hsl(var(--background))" }}
    >
      <div className="relative flex flex-col items-center">
        {/* Glow ring */}
        <div
          className="absolute h-40 w-40 rounded-full blur-3xl"
          style={{ background: "var(--gradient-accent)", opacity: 0.35 }}
        />
        <div className="relative">
          <div
            className="absolute inset-0 -m-3 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "oklch(0.72 0.20 50)",
              borderRightColor: "oklch(0.68 0.22 35)",
              animation: "spin 1.1s linear infinite",
            }}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-card/80 shadow-elegant backdrop-blur">
            <BrandMark size={44} />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          iGroBrand
        </p>
      </div>
    </div>
  );
}