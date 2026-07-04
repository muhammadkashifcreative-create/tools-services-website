import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Zap, ShieldCheck, BarChart3, Star, CheckCircle2, ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Login — Social Padu" }] }),
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot" | "reset";

function AuthPage() {
  const router = useRouter();
  const { redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const { urlError, resetToken } = useMemo(() => {
    if (typeof window === "undefined") return { urlError: null, resetToken: null };
    const p = new URLSearchParams(window.location.search);
    return { urlError: p.get("error"), resetToken: p.get("mode") === "reset" ? p.get("token") : null };
  }, []);

  // Where to land after a successful login. Only internal paths are allowed
  // (must start with "/" but not "//") so the param can't redirect off-site.
  const goAfterAuth = () => {
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      router.history.replace(redirectTo);
    } else {
      router.navigate({ to: "/dashboard", replace: true });
    }
  };

  useEffect(() => {
    if (urlError) toast.error(urlError);
    if (resetToken) setMode("reset");
    fetch("/api/auth/me").then((r) => {
      if (r.ok) goAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlError, resetToken, router]);

  const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((v) => ({ ...v, [f]: e.target.value }));
    setError(null);
  };

  const switchMode = (m: Mode) => { setMode(m); setError(null); setDone(null); setForm({ name: "", email: "", password: "", confirm: "" }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      if (!form.name.trim()) return setError("Please enter your name");
      if (form.password.length < 8) return setError("Password must be at least 8 characters");
      if (form.password !== form.confirm) return setError("Passwords do not match");
    }
    if (mode === "reset") {
      if (form.password.length < 8) return setError("Password must be at least 8 characters");
      if (form.password !== form.confirm) return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      let endpoint = "";
      let body: Record<string, string> = {};

      if (mode === "signin") {
        endpoint = "/api/auth/login";
        body = { email: form.email.trim(), password: form.password };
      } else if (mode === "signup") {
        endpoint = "/api/auth/register";
        body = { name: form.name.trim(), email: form.email.trim(), password: form.password };
      } else if (mode === "forgot") {
        endpoint = "/api/auth/forgot-password";
        body = { email: form.email.trim() };
      } else if (mode === "reset") {
        endpoint = "/api/auth/reset-password";
        body = { token: resetToken ?? "", password: form.password };
      }

      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }

      if (mode === "signin") {
        goAfterAuth();
      } else if (mode === "signup") {
        setDone("account");
      } else if (mode === "forgot") {
        setDone("forgot");
      } else if (mode === "reset") {
        setDone("reset");
        setTimeout(() => goAfterAuth(), 2000);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screens ──
  if (done === "account") return (
    <Page>
      <Card>
        <Center>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Mail className="h-8 w-8 text-amber-600" />
          </div>
        </Center>
        <h1 className="mt-4 text-center text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          We sent a verification link to <strong>{form.email}</strong>. Click the link in that email to activate your account before logging in.
        </p>
        <div className="mt-5 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800">
          ⚠️ You must verify your email before you can login.
        </div>
        <button
          onClick={() => switchMode("signin")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>
      </Card>
    </Page>
  );

  if (done === "forgot") return (
    <Page>
      <Card>
        <Center><div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"><Mail className="h-8 w-8 text-blue-600" /></div></Center>
        <h1 className="mt-4 text-center text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          If an account exists for <strong>{form.email}</strong>, we've sent a password reset link. Check your inbox — it expires in 1 hour.
        </p>
        <button onClick={() => switchMode("signin")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent transition">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>
      </Card>
    </Page>
  );

  if (done === "reset") return (
    <Page>
      <Card>
        <Center><div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div></Center>
        <h1 className="mt-4 text-center text-2xl font-bold">Password updated!</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Your password has been changed. Redirecting you to the dashboard…</p>
        <div className="mt-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      </Card>
    </Page>
  );

  return (
    <Page>
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 rounded-3xl opacity-30 blur-xl" style={{ background: "var(--gradient-accent)" }} aria-hidden />
        <div className="relative rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden">
          <div className="h-1 w-full" style={{ background: "var(--gradient-accent)" }} />
          <div className="px-8 py-10">

            {/* Logo */}
            <div className="flex justify-center mb-8"><Link to="/"><BrandMark size={160} /></Link></div>

            {/* Forgot / Reset headings */}
            {mode === "forgot" && (
              <div className="mb-6">
                <button onClick={() => switchMode("signin")} className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                </button>
                <h1 className="text-2xl font-bold">Forgot password?</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
              </div>
            )}

            {mode === "reset" && (
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Set new password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
              </div>
            )}

            {/* Tabs — only for signin/signup */}
            {(mode === "signin" || mode === "signup") && (
              <>
                <div className="flex rounded-xl border border-border/60 bg-muted/30 p-1 mb-6">
                  {(["signin", "signup"] as const).map((t) => (
                    <button key={t} onClick={() => switchMode(t)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${mode === t ? "text-white shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
                      style={mode === t ? { background: "var(--gradient-accent)" } : undefined}>
                      {t === "signin" ? "Login" : "Create Account"}
                    </button>
                  ))}
                </div>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight">{mode === "signin" ? "Welcome back" : "Join Social Padu"}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode === "signin" ? "Login to manage your orders and wallet." : "Create your free account and start growing today."}
                  </p>
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <Field label="Full name" icon={User}>
                  <input type="text" required placeholder="Muhammad Kashif" value={form.name} onChange={set("name")}
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition" />
                </Field>
              )}

              {(mode === "signin" || mode === "signup" || mode === "forgot") && (
                <Field label="Email address" icon={Mail}>
                  <input type="email" required placeholder="you@example.com" value={form.email} onChange={set("email")}
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition" />
                </Field>
              )}

              {(mode === "signin" || mode === "signup" || mode === "reset") && (
                <Field label={mode === "reset" ? "New password" : "Password"} icon={Lock}>
                  <input type={showPass ? "text" : "password"} required placeholder={mode === "signup" || mode === "reset" ? "Min. 8 characters" : "Your password"}
                    value={form.password} onChange={set("password")}
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition" />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </Field>
              )}

              {(mode === "signup" || mode === "reset") && (
                <Field label="Confirm password" icon={Lock}>
                  <input type={showConfirm ? "text" : "password"} required placeholder="Repeat password"
                    value={form.confirm} onChange={set("confirm")}
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-primary/30 transition" />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </Field>
              )}

              {/* Forgot password link */}
              {mode === "signin" && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
              )}

              {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-60 active:scale-[0.98]"
                style={{ background: "var(--gradient-accent)" }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {mode === "signin" ? "Logging in…" : mode === "signup" ? "Creating account…" : mode === "forgot" ? "Sending link…" : "Updating password…"}</>
                  : mode === "signin" ? "Login →" : mode === "signup" ? "Create Account →" : mode === "forgot" ? "Send Reset Link" : "Set New Password →"}
              </button>
            </form>

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
    </Page>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        {children}
      </div>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster />
      <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-4 py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-25 blur-3xl" style={{ background: "oklch(0.78 0.20 50)" }} />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "oklch(0.72 0.22 35)" }} />
        </div>
        {children}
      </div>
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-1 rounded-3xl opacity-30 blur-xl" style={{ background: "var(--gradient-accent)" }} aria-hidden />
      <div className="relative rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden">
        <div className="h-1 w-full" style={{ background: "var(--gradient-accent)" }} />
        <div className="px-8 py-10 flex flex-col items-center">{children}</div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center">{children}</div>;
}
