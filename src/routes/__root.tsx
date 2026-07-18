import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { CookieConsent } from "@/components/CookieConsent";
import { I18nProvider } from "@/lib/i18n";
import { PremiumLoader } from "@/components/PremiumLoader";
import { MaintenancePage } from "@/components/MaintenancePage";
import { getMaintenanceStatus } from "@/lib/maintenance.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Social Padu — Software Guide Books" },
      { name: "description", content: "Social Padu — practical guide books for computer software. Step-by-step PDF guides with instant download after secure checkout." },
      { name: "author", content: "Social Padu" },
      { property: "og:title", content: "Social Padu" },
      { property: "og:description", content: "Software guide books — buy once, download instantly, keep forever." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://www.socialpadu.my/logo.png" },
      { property: "og:site_name", content: "Social Padu" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "https://www.socialpadu.my/logo.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <PremiumLoader />
        <MaintenanceGate>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <CookieConsent />
        </MaintenanceGate>
      </I18nProvider>
    </QueryClientProvider>
  );
}

// Blocks the whole site behind a maintenance screen when maintenance mode is
// on. The admin bypasses it (with a warning banner), and /auth stays reachable
// so staff can sign in. API routes are unaffected.
function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchStatus = useServerFn(getMaintenanceStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => fetchStatus(),
    staleTime: 30_000,
    retry: 1,
  });

  // Staff must always be able to reach the login page
  if (pathname.startsWith("/auth")) return <>{children}</>;

  // Avoid flashing page content before the status is known
  if (isLoading) return null;

  if (data?.enabled && !data.bypass) return <MaintenancePage />;

  return (
    <>
      {children}
      {data?.enabled && data.bypass && (
        <div className="fixed inset-x-0 bottom-0 z-[150] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2.5 text-center text-xs font-semibold text-amber-950 sm:text-sm">
          🔧 Maintenance mode is ON — visitors see the maintenance page. You're viewing the site as admin. Turn it off in Admin → Overview.
        </div>
      )}
    </>
  );
}
