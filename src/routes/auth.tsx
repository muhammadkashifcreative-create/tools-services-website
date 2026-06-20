import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — iGroBrand" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/dashboard", replace: true });
    });
  }, [router]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <>
    <Toaster />
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex lg:flex-col lg:justify-between lg:p-12 brand-gradient">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-semibold tracking-tight">iGroBrand</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Grow on every platform.</h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Fast, transparent social media growth. Pay as you go, track every order, scale with confidence.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} iGroBrand</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark size={32} />
              <span className="font-semibold">iGroBrand</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue boosting." : "Start growing in less than a minute."}
          </p>

          <button
            onClick={handleGoogle}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-accent"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}