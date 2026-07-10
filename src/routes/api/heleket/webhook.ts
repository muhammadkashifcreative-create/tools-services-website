import { createFileRoute } from "@tanstack/react-router";

/**
 * Heleket payment webhook (the url_callback passed when creating invoices).
 * Heleket POSTs here on every invoice status change; the payload is
 * authenticated by its embedded md5 `sign` field — never by IP alone.
 *
 * Response codes matter: Heleket re-sends the webhook unless it gets a 2xx,
 * so transient errors return 500 (retry) while a bad signature returns 401
 * (drop). Unknown order_ids get a 200 so stale or test callbacks stop.
 */
export const Route = createFileRoute("/api/heleket/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const { verifyWebhookSignature } = await import("@/lib/heleket.server");
        if (!verifyWebhookSignature(payload)) {
          console.error("Heleket webhook: signature verification failed");
          return new Response("invalid signature", { status: 401 });
        }

        try {
          const { settleDeposit } = await import("@/lib/deposits.server");
          const outcome = await settleDeposit(payload as unknown as import("@/lib/heleket.server").HeleketPayment);
          console.info(`Heleket webhook: order ${String(payload.order_id)} → ${outcome}`);
          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("Heleket webhook processing failed:", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
