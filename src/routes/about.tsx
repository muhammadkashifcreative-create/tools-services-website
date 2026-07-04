import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArrowRight, Zap, ShieldCheck, Headphones, Globe2 } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Social Padu" },
      { name: "description", content: "Social Padu is a premium digital tools store — software subscriptions, AI assistants and learning platforms delivered instantly, from Malaysia to the world." },
      { property: "og:title", content: "About — Social Padu" },
      { property: "og:description", content: "Premium digital tools store. Instant delivery, transparent pricing, real support." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">

        {/* Hero */}
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft sm:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Globe2 className="h-3 w-3" /> socialpadu.my
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Premium tools,<br />
            <span className="text-gradient">honest prices.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Social Padu is a curated digital tools store — built for students, freelancers, and businesses who want premium software without the premium hassle. Every product is stock-checked live and delivered the moment you pay.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/tools/store" className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
              Browse the store <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm font-semibold hover:bg-accent">
              Get started free
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { v: "100+", l: "Products in catalog" },
            { v: "< 60s", l: "Delivery time" },
            { v: "14", l: "Languages supported" },
            { v: "24/7", l: "Support" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-border/60 bg-card p-5 text-center shadow-soft">
              <p className="text-2xl font-bold text-gradient tabular-nums">{s.v}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        {/* What we offer */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">What we offer</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, title: "Tools Store", desc: "Premium digital accounts and subscriptions delivered instantly. AI assistants, learning platforms, creative software and more — paid from your wallet or card." },
              { icon: Zap, title: "Instant Delivery", desc: "Codes and activation links appear on screen the moment payment clears, and stay saved in your order history forever." },
              { icon: Headphones, title: "24/7 Support", desc: "Open a support case from your dashboard and our team responds in minutes. Real people, real solutions." },
              { icon: Globe2, title: "Local Currency", desc: "Prices shown in Malaysian Ringgit (MYR) for visitors in Malaysia. We support 14 languages and auto-detect your currency." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mission */}
        <div className="mt-12 rounded-2xl border border-border/60 bg-card p-8">
          <h2 className="text-2xl font-bold tracking-tight">Our mission</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We believe everyone — student or CEO — deserves access to professional-grade digital tools at fair prices. Social Padu makes it simple: one account, one wallet, instant delivery. No contracts, no minimums, no waiting.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Based in Malaysia and serving customers worldwide, we are committed to transparent pricing, secure payments, and support that actually supports.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-primary/30 p-8 text-center" style={{ background: "var(--gradient-hero)" }}>
          <h2 className="text-xl font-bold">Ready to upgrade your toolkit?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create a free account and get your first tool in under a minute.</p>
          <Link to="/auth" className="mt-5 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
            Get started — it's free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </main>
      <SiteFooter />
    </div>
  );
}
