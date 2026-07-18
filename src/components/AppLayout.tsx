import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LayoutDashboard, Receipt, Shield, LogOut, Bell, BookOpen, LifeBuoy, ShoppingBag } from "lucide-react";
import { getMyProfile } from "@/lib/wallet.functions";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark } from "@/components/BrandMark";
import type { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const router = useRouter();
  const qc = useQueryClient();
  const location = useLocation();

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await fetch("/api/auth/logout", { method: "POST" });
    router.navigate({ to: "/auth", replace: true });
  };

  const subNav: Array<{ to: string; label: string; icon: typeof LayoutDashboard }> = [
    { to: "/dashboard/library", label: "My Library", icon: BookOpen },
    { to: "/dashboard/orders", label: "Purchases", icon: Receipt },
    { to: "/dashboard/support", label: "Cases", icon: LifeBuoy },
  ];

  const mainNav = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, ...subNav];

  const initial = (profile?.full_name || profile?.username || "U").trim().charAt(0).toUpperCase();
  const pageTitle =
    [...mainNav, { to: "/admin/cases", label: "Support Cases" }, { to: "/admin", label: "Admin" }]
      .find((n) => location.pathname.startsWith(n.to))?.label ?? "Dashboard";

  return (
    <div className="min-h-dvh bg-background overflow-x-hidden">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border/60 bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border/60 px-4">
          <BrandMark size={200} />
        </div>
        <nav className="flex-1 space-y-0.5 p-4">
          {/* Dashboard — top level */}
          <Link
            to="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
              location.pathname === "/dashboard"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          {/* Sub-pages indented under Dashboard */}
          <div className="ml-3 mt-0.5 border-l-2 border-border/60 pl-3 space-y-0.5">
            {subNav.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary shadow-soft"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {profile?.isAdmin && (
            <div className="mt-2 border-l-2 border-border/60 ml-3 pl-3">
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  location.pathname.startsWith("/admin")
                    ? "bg-primary/10 text-primary shadow-soft"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Shield className="h-4 w-4" />
                Admin Panel
                <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">Admin</span>
              </Link>
            </div>
          )}
        </nav>
        <div className="border-t border-border/60 p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium truncate">{profile?.full_name || profile?.username || "Member"}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        {/* Top header — desktop & mobile */}
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-xl sm:px-4 lg:flex lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <BrandMark size={150} />
              <span className="truncate text-sm font-semibold sm:text-base">{pageTitle}</span>
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="text-xs text-muted-foreground">
                Welcome, <span className="font-semibold text-foreground">{profile?.full_name || profile?.username || "there"}</span>
              </p>
              <h2 className="truncate text-lg font-semibold tracking-tight">{pageTitle}</h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <Link
              to="/books"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 md:inline-flex"
              style={{ background: "var(--gradient-accent)" }}
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Browse books
            </Link>
            <button
              type="button"
              aria-label="Notifications"
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground transition hover:text-foreground md:inline-flex"
            >
              <Bell className="h-4 w-4" />
            </button>
            {/* Avatar — opens menu on mobile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground shadow-glow"
                style={{ background: "var(--gradient-accent)" }}
                aria-label="Account menu"
              >
                {initial}
              </button>

              {avatarMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setAvatarMenuOpen(false)} />
                  {/* Dropdown */}
                  <div className="absolute right-0 top-11 z-50 w-52 rounded-2xl border border-border/60 bg-card shadow-elegant overflow-hidden">
                    {/* User info */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "var(--gradient-accent)" }}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{profile?.full_name || profile?.username || "Member"}</p>
                        {profile?.email && <p className="text-xs text-muted-foreground truncate">{profile.email}</p>}
                      </div>
                    </div>
                    {/* Links */}
                    <div className="py-1">
                      <Link to="/dashboard/support" onClick={() => setAvatarMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition">
                        <LifeBuoy className="h-4 w-4 text-primary" /> Support
                      </Link>
                    </div>
                    {/* Logout */}
                    <div className="border-t border-border/60 py-1">
                      <button
                        onClick={() => { setAvatarMenuOpen(false); handleSignOut(); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border/60 bg-card px-3 py-2 sm:px-4 lg:hidden">
          {[{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, ...subNav, ...(profile?.isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : [])].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
