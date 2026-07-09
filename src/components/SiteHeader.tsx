import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark } from "@/components/BrandMark";
import { useI18n } from "@/lib/i18n";

type NavItem = { key: string; to: string; hash?: string };

const NAV: NavItem[] = [
  { key: "nav.home", to: "/" },
  { key: "nav.tools", to: "/tools" },
  { key: "nav.about", to: "/about" },
  { key: "nav.contact", to: "/contact" },
  { key: "nav.faq", to: "/", hash: "faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center">
          <BrandMark size={200} />
        </Link>

        <nav className="hidden gap-6 text-sm text-muted-foreground lg:flex">
          {NAV.map((item) => {
            const isActive =
              !item.hash &&
              (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to));
            return (
              <Link
                key={item.key}
                to={item.to}
                hash={item.hash}
                className={
                  isActive
                    ? "font-semibold text-foreground"
                    : "transition hover:text-foreground"
                }
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <Link
            to="/auth"
            className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline"
          >
            {t("cta.signIn")}
          </Link>
          <Link
            to="/auth"
            className="rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 sm:px-4 sm:text-sm"
            style={{ background: "var(--gradient-accent)" }}
          >
            {t("cta.getStarted")}
          </Link>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:text-foreground lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-sm sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                hash={item.hash}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}