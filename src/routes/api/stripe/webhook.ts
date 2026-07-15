import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook endpoint. Configure in the Stripe dashboard:
 *   Developers → Webhooks → Add endpoint → https://www.socialpadu.my/api/stripe/webhook
 *   Events: checkout.session.completed, checkout.session.async_payment_succeeded,
 *           checkout.session.async_payment_failed, checkout.session.expired
 * Then set the signing secret as STRIPE_WEBHOOK_SECRET in Vercel.
 *
 * Response codes matter: Stripe retries anything non-2xx, so transient errors
 * return 500 (retry) while a bad signature returns 401 (drop). Sessions we
 * don't recognise get a 200 so stale or test events stop.
 */
export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.text();

        const { verifyStripeWebhook } = await import("@/lib/stripe.server");
        if (!verifyStripeWebhook(payload, request.headers.get("stripe-signature"))) {
          console.error("Stripe webhook: signature verification failed");
          return new Response("invalid signature", { status: 401 });
        }

        let event: { type: string; data: { object: Record<string, unknown> } };
        try {
          event = JSON.parse(payload);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const relevant = [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
          "checkout.session.async_payment_failed",
          "checkout.session.expired",
        ];
        if (!relevant.includes(event.type)) return new Response("ignored", { status: 200 });

        try {
          const { settleBookPurchase } = await import("@/lib/book-purchases.server");
          const session = event.data.object as unknown as import("@/lib/stripe.server").StripeCheckoutSession;
          const outcome = await settleBookPurchase(session);
          console.info(`Stripe webhook: ${event.type} session ${session.id} → ${outcome}`);
          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("Stripe webhook processing failed:", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
