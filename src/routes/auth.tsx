import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex lg:flex-col lg:justify-between lg:p-12 brand-gradient">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-semibold tracking-tight">Social Padu</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Grow on every platform.</h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Fast, transparent social media growth. Pay as you go, track every order, scale with confidence.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Social Padu</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark size={32} />
              <span className="font-semibold">Social Padu</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your Gmail to continue boosting.
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-accent disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Google verifies your Gmail and Social Padu stores only a secure login cookie.
          </p>
        </div>
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
