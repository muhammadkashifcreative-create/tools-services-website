import { useEffect, useState } from "react";
import { Sparkles, X, Copy, Check, Gift } from "lucide-react";
import { PROMO_CODE, PROMO_PERCENT } from "./AnnouncementBar";

const STORAGE_KEY = "igb_discount_popup_seen";

export function DiscountPopup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  const copy = () => {
    navigator.clipboard?.writeText(PROMO_CODE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 p-8 text-center shadow-2xl animate-scale-in"
        style={{ background: "var(--gradient-hero), var(--gradient-card)" }}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-glow"
          style={{ background: "var(--gradient-accent)" }}
        >
          <Gift className="h-8 w-8" />
        </div>

        <p className="mt-5 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur">
          <Sparkles className="h-3 w-3" /> Welcome offer
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">
          Get <span className="text-gradient">{PROMO_PERCENT}% off</span>
          <br /> your first order
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use this code at checkout — it applies to any service or tool in our catalog.
        </p>

        <button
          onClick={copy}
          className="mt-6 inline-flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-background/60 px-4 py-3 font-mono text-lg font-bold tracking-[0.25em] text-foreground transition hover:border-primary hover:bg-primary/5"
        >
          <span className="flex-1 text-center">{PROMO_CODE}</span>
          {copied ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
              <Check className="h-4 w-4" /> Copied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Copy className="h-4 w-4" /> Copy
            </span>
          )}
        </button>

        <button
          onClick={close}
          className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95"
          style={{ background: "var(--gradient-accent)" }}
        >
          Shop with discount
        </button>
        <p className="mt-3 text-[10px] text-muted-foreground">
          One-time welcome promo. Terms apply.
        </p>
      </div>
    </div>
  );
}