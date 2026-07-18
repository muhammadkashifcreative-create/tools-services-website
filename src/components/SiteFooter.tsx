import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BrandMark } from "@/components/BrandMark";
import { useI18n } from "@/lib/i18n";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { subscribeToNewsletter } from "@/lib/newsletter.functions";

export function SiteFooter() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const subscribe = useServerFn(subscribeToNewsletter);
  const subscribeMut = useMutation({
    mutationFn: () => subscribe({ data: { email } }),
    onSuccess: () => setEmail(""),
  });

  const productLinks = [
    { label: t("nav.books") ?? "Guide Books", to: "/books" },
  ];

  const companyLinks = [
    { label: t("nav.about") ?? "About", to: "/about" },
    { label: t("nav.contact") ?? "Contact", to: "/contact" },
    { label: t("nav.support") ?? "Support", to: "/dashboard/support" },
  ];

  const legalLinks = [
    { label: "Terms", to: "/terms" },
    { label: "Privacy", to: "/privacy" },
    { label: "Refunds", to: "/refund" },
  ];

  return (
    <footer className="relative border-t border-border/40 bg-muted/10">
      {/* Subtle top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 gap-10 py-16 sm:grid-cols-2 lg:grid-cols-10 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-block">
              <BrandMark size={240} />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("footer.tagline") ?? "Practical guide books for computer software — instant digital download, worldwide."}
            </p>

            {/* Support contact */}
            <div className="mt-5 space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:socialpadu@gmail.com" className="transition-colors hover:text-foreground">
                  socialpadu@gmail.com
                </a>
              </p>
              <p className="text-xs">Customer support available 24/7 — replies within 24 hours.</p>
            </div>

            {/* Newsletter */}
            <div className="mt-6">
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Stay updated
              </p>
              {subscribeMut.isSuccess ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <Check className="h-4 w-4" /> You're subscribed — thanks!
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email.trim()) subscribeMut.mutate();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      disabled={subscribeMut.isPending}
                      className="min-w-0 flex-1 rounded-lg border border-border/60 bg-card/50 px-3.5 py-2 text-sm text-foreground outline-none ring-primary/30 transition-all placeholder:text-muted-foreground/60 focus:ring-2 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={subscribeMut.isPending || !email.trim()}
                      aria-label="Subscribe"
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                    >
                      {subscribeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                  {subscribeMut.isError && (
                    <p className="mt-2 text-xs text-destructive">{(subscribeMut.error as Error).message}</p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Product links */}
          <div className="lg:col-span-2">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Product
            </p>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div className="lg:col-span-2">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Company
            </p>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div className="lg:col-span-2">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Legal
            </p>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/30 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Social Padu. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/refund" className="hover:text-foreground transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
