import { Wrench, Clock4, Mail } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export function MaintenancePage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl" style={{ background: "oklch(0.72 0.20 50 / 0.14)" }} />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full blur-3xl" style={{ background: "oklch(0.68 0.22 35 / 0.12)" }} />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="flex justify-center">
          <BrandMark size={180} />
        </div>

        <div className="relative mx-auto mt-10 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-50" style={{ background: "var(--gradient-accent)" }} aria-hidden />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-glow" style={{ background: "var(--gradient-accent)" }}>
            <Wrench className="h-9 w-9" />
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
          We'll be back <span className="text-gradient">shortly.</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Social Padu is undergoing scheduled maintenance while we make improvements.
          Your account, wallet balance, and orders are safe.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Clock4 className="h-3.5 w-3.5 text-primary" /> Back online soon
          </span>
          <a
            href="mailto:socialpadu@gmail.com"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition hover:border-primary/40 hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5 text-primary" /> socialpadu@gmail.com
          </a>
        </div>

        <p className="mt-12 text-[11px] text-muted-foreground/70">
          © {new Date().getFullYear()} Social Padu ·{" "}
          <a href="/auth" className="transition hover:text-foreground">Staff sign in</a>
        </p>
      </div>
    </div>
  );
}
