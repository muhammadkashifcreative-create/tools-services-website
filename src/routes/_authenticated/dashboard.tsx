import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pass-through layout — all sub-pages render themselves with <AppLayout>
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: () => <Outlet />,
});
