import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wrench, ShieldCheck, Zap, ShoppingBag, Bot, ArrowRight, Check, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listToolProductsPublic } from "@/lib/toolstore.functions";

export const Route = createFileRoute("/tools/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Tools Store — Premium Digital Tools & Accounts | Social Padu" },
      { name: "description", content: "Buy premium digital tools, subscriptions, and accounts instantly. Hybrid storefront powered by the Social Padu tools network." },
      { property: "og:title", content: "Social Padu Tools Store" },
      { property: "og:description", content: "Premium digital tools, instant delivery, paid from your Social Padu wallet." },
    ],
  }),
  component: ToolsMarketing,
});

function ToolsMarketing() {
  const fetchProducts = useServerFn(listToolProductsPublic);
  const { data: catalog, isLoading } = useQuery({
    queryKey: ["toolProductsPreview"],
    queryFn: () => fetchProducts(),
  });

  const preview = (catalog?.products ?? []).slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden brand-gradient">
        <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur">
              <Wrench className="h-3 w-3" /> Tools Store · Live
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Every premium tool you need. <span className="text-gradient">One wallet.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              Streaming subscriptions, premium accounts, productivity codes — delivered instantly from a curated catalog. Browse the live store, pay from your Social Padu balance, get codes immediately.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/tools/store" className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
                Browse the live store <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-4 py-2.5 text-sm font-semibold hover:bg-accent">
                Create an account
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Chip icon={Zap} label="Instant code delivery" />
              <Chip icon={ShieldCheck} label="Wallet-backed checkout" />
              <Chip icon={Bot} label="Curated premium catalog" />
            </div>
          </div>

          {/* Live product preview */}
          <div className="relative">
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted-foreground">Live catalog</p>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-600">● Live</span>
              </div>
              <div className="mt-4 space-y-3">
                {isLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : preview.length > 0 ? (
                  preview.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                      <div>
                        <p className="text-sm font-semibold">{p.name_en}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.in_stock ? (p.stock > 0 ? `${p.stock} in stock` : "In stock") : "Out of stock"}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gradient">${Number(p.your_price).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">No products available yet.</p>
                )}
              </div>
              <Link to="/tools/store" className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                View all products <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          A curated catalog of premium digital tools, paid from your Social Padu wallet, delivered instantly to your account.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { icon: ShoppingBag, title: "1. Pick a tool", body: "Browse the live catalog with real-time stock and wallet pricing." },
            { icon: ShieldCheck, title: "2. Pay from wallet", body: "Checkout deducts your Social Padu balance — no card per transaction." },
            { icon: Zap, title: "3. Get codes instantly", body: "Codes appear in your order and your dashboard within seconds." },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
            <h3 className="text-xl font-bold">Why Social Padu?</h3>
            <ul className="mt-4 space-y-3 text-sm text-foreground/90">
              {[
                "Live inventory with real-time stock — no surprises at checkout.",
                "Wallet covers both: social growth services and tool purchases.",
                "All purchases tracked under one account, one invoice history.",
                "Multi-language, RTL-ready, and mobile-first by default.",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> {b}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
            <h3 className="text-xl font-bold">Become a partner</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Run a tools business and want a second sales channel? Get in touch and our team will onboard your catalog onto Social Padu.
            </p>
            <Link to="/support" className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-semibold hover:bg-accent">
              Contact support <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </span>
  );
}
