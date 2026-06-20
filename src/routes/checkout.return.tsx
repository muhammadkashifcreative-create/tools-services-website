import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment complete — iGroBrand" }] }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-500" />
      <h1 className="mt-4 text-2xl font-bold">Payment received</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {session_id
          ? "Your wallet will reflect the new balance within a few seconds."
          : "No payment session was found."}
      </p>
      <Link
        to="/wallet"
        className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Back to wallet
      </Link>
    </div>
  );
}