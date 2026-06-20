import { useState } from "react";
import { Sparkles, Copy, Check, X } from "lucide-react";

export const PROMO_CODE = "WELCOME5";
export const PROMO_PERCENT = 5;

export function AnnouncementBar() {
  const [copied, setCopied] = useState(false);
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  const copy = () => {
    navigator.clipboard?.writeText(PROMO_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="relative w-full overflow-hidden text-white"
      style={{ background: "var(--gradient-accent)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-xs font-medium sm:text-sm">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        <span>Limited offer — {PROMO_PERCENT}% off your order with code</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/40 bg-white/10 px-2 py-0.5 font-mono font-bold tracking-wider backdrop-blur transition hover:bg-white/20"
        >
          {PROMO_CODE}
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <button
        onClick={() => setClosed(true)}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}