import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired tools-store URL — shared product links redirect to the book library.
export const Route = createFileRoute("/tools/store")({
  beforeLoad: () => {
    throw redirect({ to: "/books", replace: true });
  },
  component: () => null,
});
