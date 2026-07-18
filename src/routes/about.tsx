import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArrowRight, BookOpen, Download, Headphones, Globe2 } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Social Padu" },
      { name: "description", content: "Social Padu publishes practical guide books for computer software — Excel, Photoshop, Python, AI tools and more. Instant PDF downloads, from Malaysia to the world." },
      { property: "og:title", content: "About — Social Padu" },
      { property: "og:description", content: "Digital bookstore for software guide books. Instant download, honest prices, real support." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">

        {/* Hero */}
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft sm:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Globe2 className="h-3 w-3" /> socialpadu.my
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Software skills,<br />
            <span className="text-gradient">one book at a time.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Social Padu is a digital bookstore publishing practical guide books for computer software — built for students, freelancers, and professionals who learn best from clear, step-by-step instruction. Every book is a PDF you download instantly and keep forever.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/books" className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
              Browse the library <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm font-semibold hover:bg-accent">
              Get started free
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { v: "PDF", l: "High-quality format" },
            { v: "< 60s", l: "Checkout to download" },
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
              { icon: BookOpen, title: "Guide Books", desc: "Step-by-step PDF guide books for the software people actually use — office suites, design apps, developer tools and AI assistants. Clear chapters, screenshots, and exercises." },
              { icon: Download, title: "Instant Delivery", desc: "The moment your Stripe payment clears, the book appears in your library. Re-download it any time, on any device — it's yours for life." },
              { icon: Headphones, title: "24/7 Support", desc: "Open a support case from your dashboard and our team responds in minutes. Real people, real solutions." },
              { icon: Globe2, title: "Local Currency", desc: "Prices are shown in your local currency at live exchange rates, and the site speaks 14 languages. Payments are processed securely in USD by Stripe." },
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
            Software moves fast, and most people are left to figure it out alone. We believe everyone — student or CEO — deserves a clear, affordable path to mastering the tools their work depends on. No subscriptions, no video courses you never finish: just well-written books you can read at your own pace.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Based in Malaysia and serving readers worldwide, we are committed to honest pricing, secure payments, and support that actually supports.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-primary/30 p-8 text-center" style={{ background: "var(--gradient-hero)" }}>
          <h2 className="text-xl font-bold">Ready to master your software?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create a free account and start reading your first guide book in under a minute.</p>
          <Link to="/auth" className="mt-5 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow" style={{ background: "var(--gradient-accent)" }}>
            Get started — it's free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </main>
      <SiteFooter />
    </div>
  );
}
