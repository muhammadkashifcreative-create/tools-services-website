import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const response = await fetch("/api/auth/me");
    if (!response.ok) throw redirect({ to: "/auth" });
    const data = (await response.json()) as {
      user: { sub: string; email: string; name?: string; picture?: string } | null;
    };
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
