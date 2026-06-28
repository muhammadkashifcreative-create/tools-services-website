import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pass-through layout — admin sub-pages render themselves
export const Route = createFileRoute("/_authenticated/admin")({
  component: () => <Outlet />,
});
