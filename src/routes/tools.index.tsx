import { createFileRoute, redirect } from "@tanstack/react-router";

// /tools redirects to /new-order where users choose between SMM and Tools Store
export const Route = createFileRoute("/tools/")({
  beforeLoad: () => {
    throw redirect({ to: "/new-order" });
  },
  component: () => null,
});
