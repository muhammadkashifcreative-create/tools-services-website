import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Mail, MessageSquare, Facebook, Clock, ArrowRight, Headphones } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support — Social Padu" },
      { name: "description", content: "Get in touch with Social Padu customer support — email us at socialpadu@gmail.com or open a support case. We respond within 24 hours." },
      { property: "og:title", content: "Contact & Support — Social Padu" },
      { property: "og:description", content: "Email socialpadu@gmail.com or open a support case from your dashboard. We respond within 24 hours." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">

        {/* Hero */}
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-soft sm:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Headphones className="h-3 w-3" /> Customer Support
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Contact <span className="text-gradient">Social Padu</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Questions about an order, a payment, or a product? Our support team is here to help — reach us any of the ways below and we'll get back to you within 24 hours, usually much faster.
          </p>
        </div>

        {/* Contact channels */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:socialpadu@gmail.com"
            className="group rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:border-primary/40 hover:shadow-glow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">Email Support</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              For order issues, refunds, billing questions or anything else — email us directly.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              socialpadu@gmail.com <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          </a>

          <Link
            to="/dashboard/support"
            className="group rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:border-primary/40 hover:shadow-glow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">Open a Support Case</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Signed-in customers can open a case from the dashboard and track replies in one place.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Go to support cases <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>

          <a
            href="https://www.facebook.com/share/1Br9BxZdvj/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all hover:border-primary/40 hover:shadow-glow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
              <Facebook className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">Facebook</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Follow us or send a message on our official Facebook page.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Message us on Facebook <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          </a>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-accent)" }}>
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">Response Times</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Support cases are answered around the clock. Emails are answered within 24 hours — typically within a few hours during Malaysian business hours (GMT+8).
            </p>
          </div>
        </div>

        {/* What to include */}
        <div className="mt-12 rounded-2xl border border-border/60 bg-card p-8 shadow-soft">
          <h2 className="text-xl font-bold tracking-tight">Help us help you faster</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            When contacting support about an order, please include:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Your order ID (shown in your dashboard and confirmation email).</li>
            <li>The email address on your Social Padu account.</li>
            <li>A short description of the issue, with screenshots if relevant.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            For refund eligibility and how refunds are issued, see our{" "}
            <Link to="/refund" className="text-primary hover:underline">Refund Policy</Link>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
