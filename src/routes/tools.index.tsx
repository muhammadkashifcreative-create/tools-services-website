import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired tools-store URL — redirects to the book library.
export const Route = createFileRoute("/tools/")({
  beforeLoad: () => {
    throw redirect({ to: "/books", replace: true });
  },
  component: () => null,
});
