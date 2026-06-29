import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle, Wallet } from "lucide-react";
import { confirmOrderCheckout } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment complete — Social Padu" }] }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string; env?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
    env: typeof search.env === "string" ? search.env : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id, env } = Route.useSearch();
  const router = useRouter();
  const confirm = useServerFn(confirmOrderCheckout);
  const [state, setState] = useState<"loading" | "success" | "wallet" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!session_id) {
      setState("error");
      setErrorMsg("No payment session found.");
      return;
    }
    const environment = (env === "sandbox" || env === "live") ? env : getStripeEnvironment();
    confirm({ data: { sessionId: session_id, environment } })
      .then(() => {
        setState("success");
        setTimeout(() => router.navigate({ to: "/dashboard/orders" }), 2500);
      })
      .catch((e: Error) => {
        // Provider failed — payment was credited to wallet instead
        if (e.message.includes("credited to your wallet")) {
          setState("wallet");
        } else {
          setState("error");
          setErrorMsg(e.message);
        }
      });
  }, []);

  if (state === "loading") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Processing your order…</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please wait while we confirm your payment and place your order.</p>
      </div>
    );
  }

  if (state === "wallet") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <Wallet className="h-14 w-14 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Payment credited to wallet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not submit your order to the provider right now. Your payment has been added to your wallet balance — please try placing the order again.
        </p>
        <Link
          to="/dashboard/new-order"
          className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Place order again
        </Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <XCircle className="h-14 w-14 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMsg || "Could not confirm your order. Please contact support."}</p>
        <Link
          to="/dashboard/new-order"
          className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-500" />
      <h1 className="mt-4 text-2xl font-bold">Order placed!</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your order is confirmed and being processed. Redirecting to your orders…</p>
      <Link
        to="/dashboard/orders"
        className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        View orders
      </Link>
    </div>
  );
}
