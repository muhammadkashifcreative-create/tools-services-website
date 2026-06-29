import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Zap, ShieldCheck, BarChart3, Star, CheckCircle2 } from "lucide-react";
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
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const urlError = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("error");
  }, []);

  useEffect(() => {
    if (urlError) toast.error(urlError);
    fetch("/api/auth/me").then((r) => {
      if (r.ok) router.navigate({ to: "/dashboard", replace: true });
    });
  }, [urlError, router]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "signup") {
      if (!form.name.trim()) return setError("Please enter your name");
      if (form.password.length < 8) return setError("Password must be at least 8 characters");
      if (form.password !== form.confirm) return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      const endpoint = tab === "signup" ? "/api/auth/register" : "/api/auth/login";
      const body = tab === "signup"
        ? { name: form.name.trim(), email: form.email.trim(), password: form.password }
        : { email: form.email.trim(), password: form.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (tab === "signup") {
        setSuccess(true);
      } else {
        router.navigate({ to: "/dashboard", replace: true });
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Toaster />
        <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-4 py-12">
          <Blobs />
          <div className="relative w-full max-w-md text-center">
            <div className="absolute -inset-1 rounded-3xl opacity-30 blur-xl" style={{ background: "var(--gradient-accent)" }} aria-hidden />
            <div className="relative rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden">
              <div className="h-1 w-full" style={{ background: "var(--gradient-accent)" }} />
              <div className="px-8 py-12">
                <div className="flex justify-center mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Account created!</h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  Welcome to Social Padu. A welcome email has been sent to <strong>{form.email}</strong>.
                </p>
                <button
                  onClick={() => router.navigate({ to: "/dashboard", replace: true })}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  Go to Dashboard →
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster />
      <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-4 py-12">
        <Blobs />
        <div className="relative w-full max-w-md">
          <div className="absolute -inset-1 rounded-3xl opacity-30 blur-xl" style={{ background: "var(--gradient-accent)" }} aria-hidden />
          <div className="relative rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ background: "var(--gradient-accent)" }} />

            <div className="px-8 py-10">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <Link to="/"><BrandMark size={160} /></Link>
              </div>

              {/* Tabs */}
              <div className="flex rounded-xl border border-border/60 bg-muted/30 p-1 mb-6">
                {(["signin", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(null); setForm({ name: "", email: "", password: "", confirm: "" }); }}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                      tab === t
                        ? "bg-card text-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "signin" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>

              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  {tab === "signin" ? "Welcome back" : "Join Social Padu"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab === "signin"
                    ? "Sign in to manage your orders and wallet."
                    : "Create your free account and start growing today."}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Full name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text" required placeholder="Muhammad Kashif"
                        value={form.name} onChange={set("name")}
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email" required placeholder="you@example.com"
                      value={form.email} onChange={set("email")}
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPass ? "text" : "password"} required
                      placeholder={tab === "signup" ? "Min. 8 characters" : "Your password"}
                      value={form.password} onChange={set("password")}
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition"
                    />
                    <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {tab === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Confirm password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type={showConfirm ? "text" : "password"} required placeholder="Repeat password"
                        value={form.confirm} onChange={set("confirm")}
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition"
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {tab === "signin" ? "Signing in…" : "Creating account…"}</>
                    : tab === "signin" ? "Sign In →" : "Create Account →"
                  }
                </button>
              </form>

              {/* Features (signup only) */}
              {tab === "signup" && (
                <>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">What you get</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      { icon: Zap, text: "Orders start in under 60 seconds" },
                      { icon: ShieldCheck, text: "Secure wallet, pay as you go" },
                      { icon: BarChart3, text: "Real-time order tracking" },
                      { icon: Star, text: "5,786+ services across 16 platforms" },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3.5 py-2.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-accent)" }}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <p className="text-xs font-medium text-foreground">{text}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Footer */}
              <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link>
                {" & "}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
              </p>
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition">← Back to Social Padu</Link>
          </p>
        </div>
      </div>
    </>
  );
}

function Blobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-25 blur-3xl" style={{ background: "oklch(0.78 0.20 50)" }} />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "oklch(0.72 0.22 35)" }} />
    </div>
  );
}
