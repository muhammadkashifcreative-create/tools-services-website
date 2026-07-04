import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { useI18n } from "@/lib/i18n";
import { ArrowRight, Facebook } from "lucide-react";
import { useState } from "react";

export function SiteFooter() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");

  const productLinks = [
    { label: t("nav.tools") ?? "Tools Store", to: "/tools" },
  ];

  const companyLinks = [
    { label: t("nav.about") ?? "About", to: "/about" },
    { label: "Cases", to: "/dashboard/support" },
    { label: t("nav.contact") ?? "Contact", to: "mailto:support@socialpadu.my" },
  ];

  const legalLinks = [
    { label: "Terms", to: "/terms" },
    { label: "Privacy", to: "/privacy" },
    { label: "Refunds", to: "/refund" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "https://www.facebook.com/share/1Br9BxZdvj/?mibextid=wwXIfr", label: "Facebook" },
  ];

  return (
    <footer className="relative border-t border-border/40 bg-muted/10">
      {/* Subtle top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 gap-10 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-block">
              <BrandMark size={240} />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("footer.tagline") ?? "Premium digital tools and subscriptions, delivered instantly worldwide."}
            </p>

            {/* Newsletter */}
            <div className="mt-6">
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Stay updated
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 rounded-lg border border-border/60 bg-card/50 px-3.5 py-2 text-sm text-foreground outline-none ring-primary/30 transition-all placeholder:text-muted-foreground/60 focus:ring-2"
                />
                <button
                  className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 active:scale-95"
                  onClick={() => setEmail("")}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
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

          {/* Social links */}
          <div className="lg:col-span-2">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Follow
            </p>
            <div className="flex flex-wrap gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 bg-card/50 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground hover:shadow-soft"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
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
