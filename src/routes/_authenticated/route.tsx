import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Preserve the page the user was heading to so login returns them there
    const toAuth = () => redirect({ to: "/auth", search: { redirect: location.href } });
    const response = await fetch("/api/auth/me");
    if (!response.ok) throw toAuth();
    const data = (await response.json()) as {
      user: { sub: string; email: string; name?: string; picture?: string } | null;
    };
    if (!data.user) throw toAuth();
    return { user: data.user };
  },
  component: () => <Outlet />,
});
