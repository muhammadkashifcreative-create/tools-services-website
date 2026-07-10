import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth } from "@/lib/direct-auth-middleware.server";

export const MIN_TOPUP_USD = 5;
export const MAX_TOPUP_USD = 5000;

/**
 * Coins offered in our own checkout UI. `currency`/`network` are Heleket API
 * codes; picking one lets Heleket return the deposit address directly so the
 * customer never leaves our site. Coins not listed here remain reachable via
 * the hosted payment page (no coinId → redirect mode).
 */
export const TOPUP_COINS = [
  { id: "usdt-tron", label: "USDT", networkLabel: "TRC20", currency: "USDT", network: "tron", hint: "Recommended · low fee" },
  { id: "usdt-bsc", label: "USDT", networkLabel: "BEP20", currency: "USDT", network: "bsc", hint: "Low fee" },
  { id: "usdt-polygon", label: "USDT", networkLabel: "Polygon", currency: "USDT", network: "polygon", hint: "Low fee" },
  { id: "usdt-eth", label: "USDT", networkLabel: "ERC20", currency: "USDT", network: "eth", hint: "Higher network fee" },
  { id: "btc", label: "BTC", networkLabel: "Bitcoin", currency: "BTC", network: "btc", hint: "" },
  { id: "eth", label: "ETH", networkLabel: "Ethereum", currency: "ETH", network: "eth", hint: "" },
  { id: "bnb", label: "BNB", networkLabel: "BEP20", currency: "BNB", network: "bsc", hint: "" },
  { id: "sol", label: "SOL", networkLabel: "Solana", currency: "SOL", network: "sol", hint: "" },
  { id: "ltc", label: "LTC", networkLabel: "Litecoin", currency: "LTC", network: "ltc", hint: "Low fee" },
  { id: "trx", label: "TRX", networkLabel: "TRON", currency: "TRX", network: "tron", hint: "Low fee" },
  { id: "ton", label: "TON", networkLabel: "TON", currency: "TON", network: "ton", hint: "" },
  { id: "doge", label: "DOGE", networkLabel: "Dogecoin", currency: "DOGE", network: "doge", hint: "" },
] as const;

export type TopUpCoinId = (typeof TOPUP_COINS)[number]["id"];

export type CreateTopUpResult =
  | {
      mode: "address";
      depositId: string;
      address: string;
      payerAmount: string;
      payerCurrency: string;
      networkLabel: string;
      qrCode: string | null;
      expiresAt: number | null;
      url: string | null;
    }
  | { mode: "redirect"; depositId: string; url: string };

/**
 * Starts a crypto top-up: records a pending deposit and creates a Heleket
 * invoice for it. With a known coinId the deposit address comes back inline
 * (mode "address") for our own checkout dialog; otherwise the caller
 * redirects to the hosted payment page (mode "redirect").
 */
export const createTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        amount: z.number().min(MIN_TOPUP_USD).max(MAX_TOPUP_USD),
        coinId: z.string().max(32).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<CreateTopUpResult> => {
    const { isHeleketConfigured, createInvoice } = await import("@/lib/heleket.server");
    if (!isHeleketConfigured()) {
      throw new Error("Crypto top-ups are not configured yet. Please contact support.");
    }

    const coin = TOPUP_COINS.find((c) => c.id === data.coinId);
    const amountUsd = Math.round(data.amount * 100) / 100;
    // SITE_URL keeps callbacks pointing at production even if a request
    // arrives via a preview deployment URL.
    const origin = process.env.SITE_URL ?? new URL(getRequest().url).origin;

    const { depositsTable } = await import("@/lib/deposits.server");
    const table = await depositsTable();

    const { data: deposit, error } = (await table
      .insert({ user_id: context.userId, amount_usd: amountUsd })
      .select("id")
      .single()) as { data: { id: string } | null; error: { message: string } | null };
    if (error || !deposit) {
      throw new Error(`Could not start top-up: ${error?.message ?? "deposit not created"}`);
    }

    try {
      const invoice = await createInvoice({
        amountUsd,
        orderId: deposit.id,
        origin,
        toCurrency: coin?.currency,
        network: coin?.network,
      });
      await table
        .update({
          provider_uuid: invoice.uuid,
          payment_url: invoice.url ?? null,
          payer_currency: invoice.payer_currency ?? coin?.currency ?? null,
        })
        .eq("id", deposit.id);

      if (coin && invoice.address && invoice.payer_amount) {
        return {
          mode: "address",
          depositId: deposit.id,
          address: invoice.address,
          payerAmount: invoice.payer_amount,
          payerCurrency: invoice.payer_currency ?? coin.currency,
          networkLabel: coin.networkLabel,
          qrCode: invoice.address_qr_code ?? null,
          expiresAt: invoice.expired_at ?? null,
          url: invoice.url ?? null,
        };
      }
      if (!invoice.url) throw new Error("Payment provider returned no payment page.");
      return { mode: "redirect", depositId: deposit.id, url: invoice.url };
    } catch (e) {
      // Invoice creation failed — close the orphaned row so it never reconciles.
      await table.update({ status: "failed" }).eq("id", deposit.id).eq("status", "pending");
      console.error("Heleket invoice creation failed:", e);
      const msg = e instanceof Error ? e.message : "";
      // Coin-specific rejections (below minimum, coin disabled) are actionable
      // for the user — pass them through instead of a generic error.
      if (coin && msg && !msg.includes("not configured")) {
        throw new Error(
          `${coin.label} (${coin.networkLabel}) is unavailable for this amount — try another coin or a larger amount. (${msg})`,
        );
      }
      throw new Error("Payment provider is unavailable right now. Please try again in a minute.");
    }
  });

/**
 * Live status for one deposit, used by the checkout dialog while it waits.
 * Settles the deposit inline when Heleket reports it paid, so the dialog
 * flips to success even before the webhook lands.
 */
export const getDepositStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ depositId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { depositsTable, settleDeposit } = await import("@/lib/deposits.server");
    const table = await depositsTable();

    const fetchRow = async () =>
      (await table
        .select("id, status, credited_usd")
        .eq("id", data.depositId)
        .eq("user_id", context.userId)
        .maybeSingle()) as { data: { id: string; status: string; credited_usd: number | null } | null };

    let { data: row } = await fetchRow();
    if (!row) throw new Error("Deposit not found");

    if (row.status === "pending") {
      try {
        const { getPaymentInfo } = await import("@/lib/heleket.server");
        const info = await getPaymentInfo(data.depositId);
        const outcome = await settleDeposit(info);
        if (outcome !== "still_pending") ({ data: row } = await fetchRow());
      } catch (e) {
        // Provider hiccup — report the row as-is; the next poll retries.
        console.error(`Deposit status check failed for ${data.depositId}:`, e);
      }
    }

    return { status: row?.status ?? "pending", creditedUsd: Number(row?.credited_usd ?? 0) };
  });

/**
 * Settles any of the user's recent pending deposits by querying Heleket
 * directly. Safety net for missed webhooks; also what makes the wallet page
 * update moments after the user returns from the payment page.
 */
export const reconcileMyDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isHeleketConfigured, getPaymentInfo } = await import("@/lib/heleket.server");
    const { depositsTable, settleDeposit } = await import("@/lib/deposits.server");
    if (!isHeleketConfigured()) return { configured: false, credited: 0, pending: [] };

    const table = await depositsTable();
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: rows } = (await table
      .select("id, amount_usd, payment_url, created_at")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10)) as {
      data: { id: string; amount_usd: number; payment_url: string | null; created_at: string }[] | null;
    };

    let credited = 0;
    const stillPending: { id: string; amountUsd: number; paymentUrl: string | null }[] = [];

    for (const row of rows ?? []) {
      try {
        const info = await getPaymentInfo(row.id);
        const outcome = await settleDeposit(info);
        if (outcome === "credited") credited += 1;
        else if (outcome === "still_pending") {
          stillPending.push({ id: row.id, amountUsd: Number(row.amount_usd), paymentUrl: row.payment_url });
        }
      } catch (e) {
        // One bad lookup shouldn't block the rest — it stays pending for next time.
        console.error(`Deposit reconcile failed for ${row.id}:`, e);
        stillPending.push({ id: row.id, amountUsd: Number(row.amount_usd), paymentUrl: row.payment_url });
      }
    }

    return { configured: true, credited, pending: stillPending };
  });
