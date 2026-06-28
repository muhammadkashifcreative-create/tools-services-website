import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Zap, ShieldCheck, BarChart3, Star } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Social Padu" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const error = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("error");
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
    fetch("/api/auth/me").then((res) => {
      if (res.ok) router.navigate({ to: "/dashboard", replace: true });
    });
  }, [error, router]);

  const handleGoogle = () => {
    setLoading(true);
    window.location.href = "/api/auth/google";
  };

  return (
    <>
      <Toaster />

      {/* Full-page background */}
      <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-4 py-12">

        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-30 blur-3xl" style={{ background: "oklch(0.78 0.20 50)" }} />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "oklch(0.72 0.22 35)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full opacity-10 blur-3xl" style={{ background: "oklch(0.76 0.19 55)" }} />
        </div>

        {/* Card */}
        <div className="relative w-full max-w-md">

          {/* Glow ring */}
          <div className="absolute -inset-1 rounded-3xl opacity-30 blur-xl" style={{ background: "var(--gradient-accent)" }} aria-hidden />

          <div className="relative rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden">

            {/* Top accent bar */}
            <div className="h-1 w-full" style={{ background: "var(--gradient-accent)" }} />

            <div className="px-8 py-10">

              {/* Logo */}
              <div className="flex justify-center">
                <Link to="/">
                  <BrandMark size={160} />
                </Link>
              </div>

              {/* Heading */}
              <div className="mt-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign in to grow your social media presence
                </p>
              </div>

              {/* Google button */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-semibold transition-all hover:bg-accent hover:border-primary/30 hover:shadow-md disabled:opacity-60 active:scale-[0.98]"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  : <GoogleIcon />
                }
                {loading ? "Signing in…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div className="mt-8 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Why Social Padu</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Features */}
              <div className="mt-5 space-y-3">
                {[
                  { icon: Zap, text: "Orders start in under 60 seconds" },
                  { icon: ShieldCheck, text: "No password required, ever" },
                  { icon: BarChart3, text: "Real-time order tracking" },
                  { icon: Star, text: "5,786+ services across 16 platforms" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-accent)" }}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-xs font-medium text-foreground">{text}</p>
                  </div>
                ))}
              </div>

              {/* Footer note */}
              <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link>
                {" "}and{" "}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
                {" "}We only store a secure login cookie.
              </p>

            </div>
          </div>

          {/* Bottom link */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition">← Back to Social Padu</Link>
          </p>
        </div>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
