import { createFileRoute, redirect } from "@tanstack/react-router";

// /tools redirects to /tools/store (public catalog)
export const Route = createFileRoute("/tools/")({
  beforeLoad: () => {
    throw redirect({ to: "/tools/store" });
  },
  component: () => null,
});
