import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth } from "@/lib/direct-auth-middleware.server";

export const MIN_TOPUP_USD = 5;
export const MAX_TOPUP_USD = 5000;

/**
 * Coins/networks offered at checkout. `currency`/`network` are gateway API
 * codes. Entries sharing a `label` are the same coin on different networks —
 * the UI groups them into a coin row + network chips. Order within a group
 * matters: the first network is the default (cheapest fees first).
 */
export const TOPUP_COINS = [
  { id: "usdt-bsc", label: "USDT", networkLabel: "BEP20", currency: "USDT", network: "bsc", hint: "Recommended · lowest fee" },
  { id: "usdt-polygon", label: "USDT", networkLabel: "Polygon", currency: "USDT", network: "polygon", hint: "Low fee" },
  { id: "usdt-tron", label: "USDT", networkLabel: "TRC20", currency: "USDT", network: "tron", hint: "Higher network fee" },
  { id: "usdt-eth", label: "USDT", networkLabel: "ERC20", currency: "USDT", network: "eth", hint: "High network fee" },
  { id: "btc", label: "BTC", networkLabel: "Bitcoin", currency: "BTC", network: "btc", hint: "" },
  { id: "eth", label: "ETH", networkLabel: "Ethereum", currency: "ETH", network: "eth", hint: "" },
  { id: "bnb", label: "BNB", networkLabel: "BEP20", currency: "BNB", network: "bsc", hint: "Low fee" },
  { id: "sol", label: "SOL", networkLabel: "Solana", currency: "SOL", network: "sol", hint: "Low fee" },
  { id: "ltc", label: "LTC", networkLabel: "Litecoin", currency: "LTC", network: "ltc", hint: "Low fee" },
  { id: "trx", label: "TRX", networkLabel: "TRON", currency: "TRX", network: "tron", hint: "Low fee" },
  { id: "ton", label: "TON", networkLabel: "TON", currency: "TON", network: "ton", hint: "Low fee" },
  { id: "doge", label: "DOGE", networkLabel: "Dogecoin", currency: "DOGE", network: "doge", hint: "" },
] as const;

export interface TopUpPayment {
  depositId: string;
  address: string;
  payerAmount: string;
  payerCurrency: string;
  networkLabel: string;
  expiresAt: number | null;
}

function networkLabelFor(currency: string | null, network: string | null | undefined): string {
  const hit = TOPUP_COINS.find((c) => c.currency === currency && c.network === network);
  return hit?.networkLabel ?? (network ? network.toUpperCase() : "");
}

/**
 * Starts a crypto top-up: records a pending deposit, creates a gateway
 * invoice locked to the chosen coin+network, and returns the deposit
 * address for our own checkout dialog. The customer never leaves the site.
 */
export const createTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        amount: z.number().min(MIN_TOPUP_USD).max(MAX_TOPUP_USD),
        coinId: z.string().max(32),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<TopUpPayment> => {
    const { isHeleketConfigured, createInvoice } = await import("@/lib/heleket.server");
    if (!isHeleketConfigured()) {
      throw new Error("Crypto top-ups are not configured yet. Please contact support.");
    }

    const coin = TOPUP_COINS.find((c) => c.id === data.coinId);
    if (!coin) throw new Error("Please choose a coin and network.");
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
        toCurrency: coin.currency,
        network: coin.network,
      });
      if (!invoice.address || !invoice.payer_amount) {
        throw new Error("no deposit address returned");
      }
      await table
        .update({
          provider_uuid: invoice.uuid,
          payment_url: invoice.url ?? null,
          payer_currency: invoice.payer_currency ?? coin.currency,
        })
        .eq("id", deposit.id);

      return {
        depositId: deposit.id,
        address: invoice.address,
        payerAmount: invoice.payer_amount,
        payerCurrency: invoice.payer_currency ?? coin.currency,
        networkLabel: coin.networkLabel,
        expiresAt: invoice.expired_at ?? null,
      };
    } catch (e) {
      // Invoice creation failed — close the orphaned row so it never reconciles.
      await table.update({ status: "failed" }).eq("id", deposit.id).eq("status", "pending");
      console.error("Invoice creation failed:", e);
      const msg = e instanceof Error ? e.message : "";
      // Coin-specific rejections (below minimum, coin disabled) are actionable
      // for the user — surface them instead of a generic error.
      if (msg && !msg.includes("not configured")) {
        throw new Error(
          `${coin.label} on ${coin.networkLabel} is unavailable for this amount — try another network or a larger amount.`,
        );
      }
      throw new Error("Payments are unavailable right now. Please try again in a minute.");
    }
  });

/**
 * Reopens the checkout dialog for a still-pending deposit, so an interrupted
 * payment can be finished on-site instead of via any external page.
 */
export const resumeDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ depositId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<TopUpPayment> => {
    const { depositsTable, settleDeposit } = await import("@/lib/deposits.server");
    const { getPaymentInfo } = await import("@/lib/heleket.server");
    const table = await depositsTable();

    const { data: row } = (await table
      .select("id, status, payer_currency")
      .eq("id", data.depositId)
      .eq("user_id", context.userId)
      .maybeSingle()) as { data: { id: string; status: string; payer_currency: string | null } | null };
    if (!row) throw new Error("Top-up not found.");
    if (row.status !== "pending") throw new Error("This top-up is already finished.");

    const info = await getPaymentInfo(row.id);
    // If it settled while we weren't looking, record that and tell the user.
    const outcome = await settleDeposit(info);
    if (outcome !== "still_pending" && outcome !== "not_found") {
      throw new Error("This top-up just completed — your balance is up to date.");
    }
    if (!info.address || !info.payer_amount) {
      throw new Error("This payment can't be resumed. It will expire on its own — please start a new top-up.");
    }

    return {
      depositId: row.id,
      address: info.address,
      payerAmount: info.payer_amount,
      payerCurrency: info.payer_currency ?? row.payer_currency ?? "",
      networkLabel: networkLabelFor(info.payer_currency ?? row.payer_currency, info.network),
      expiresAt: info.expired_at ?? null,
    };
  });

/**
 * Live status for one deposit, used by the checkout dialog while it waits.
 * Settles the deposit inline when the gateway reports it paid, so the dialog
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
 * Settles any of the user's recent pending deposits by querying the gateway
 * directly. Safety net for missed webhooks; also what makes the wallet page
 * update moments after payment.
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
      .select("id, amount_usd, created_at")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10)) as {
      data: { id: string; amount_usd: number; created_at: string }[] | null;
    };

    let credited = 0;
    const stillPending: { id: string; amountUsd: number }[] = [];

    for (const row of rows ?? []) {
      try {
        const info = await getPaymentInfo(row.id);
        const outcome = await settleDeposit(info);
        if (outcome === "credited") credited += 1;
        else if (outcome === "still_pending") {
          stillPending.push({ id: row.id, amountUsd: Number(row.amount_usd) });
        }
      } catch (e) {
        // One bad lookup shouldn't block the rest — it stays pending for next time.
        console.error(`Deposit reconcile failed for ${row.id}:`, e);
        stillPending.push({ id: row.id, amountUsd: Number(row.amount_usd) });
      }
    }

    return { configured: true, credited, pending: stillPending };
  });
