import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

const KEY = "igrobrand_cookie_consent_v1";

export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const decide = (value: "all" | "essential") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6 animate-fade-in">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-border/60 bg-card/90 p-5 shadow-elegant backdrop-blur-xl sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
          <Cookie className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">We use cookies</p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Cookies help us keep you signed in, remember your preferences and improve performance. You can accept all or stick to the essentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => decide("essential")}
            className="rounded-lg border border-border/60 bg-background/60 px-4 py-2 text-xs font-semibold hover:bg-accent"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => decide("all")}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-95"
            style={{ background: "var(--gradient-accent)" }}
          >
            Accept all
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => decide("essential")}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent sm:flex"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}