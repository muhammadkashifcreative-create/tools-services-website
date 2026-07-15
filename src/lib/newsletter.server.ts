/**
 * New-book launch announcements. announceBook() runs once per book — the
 * books.announced_at column is claimed with a conditional UPDATE so repeated
 * publishes or concurrent saves can never double-email the user base.
 * Recipients are every auth user except those who clicked unsubscribe
 * (profiles.marketing_opt_out).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { booksTable } from "@/lib/book-purchases.server";

const BASE_URL = process.env.SITE_URL ?? "https://www.socialpadu.my";

function unsubSecret(): string {
  // Server-only secret that already exists in every deployment
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "unconfigured-unsub-secret";
}

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", unsubSecret()).update(`unsub:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function unsubscribeUrl(userId: string): string {
  return `${BASE_URL}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

type Recipient = { id: string; email: string; name: string };

async function collectRecipients(): Promise<Recipient[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Users who opted out of promotional email (untyped query — the
  // marketing_opt_out column ships via migration, not the generated types)
  const optedOut = new Set<string>();
  try {
    const { data } = await (supabaseAdmin as unknown as SupabaseClient)
      .from("profiles")
      .select("id")
      .eq("marketing_opt_out", true);
    for (const row of (data ?? []) as Array<{ id: string }>) optedOut.add(row.id);
  } catch { /* column may not exist yet — everyone stays subscribed */ }

  const recipients: Recipient[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users) {
      if (!u.email || optedOut.has(u.id)) continue;
      const name = ((u.user_metadata as { name?: string } | null)?.name ?? u.email.split("@")[0]) || "there";
      recipients.push({ id: u.id, email: u.email, name });
    }
    if (users.length < 1000) break;
  }
  return recipients;
}

export type AnnounceResult = { sent: number; skipped: number } | { alreadyAnnounced: true };

export async function announceBook(bookId: string): Promise<AnnounceResult> {
  const books = await booksTable();

  // Claim: only the first caller past this line sends the emails
  const { data: claimed } = await books
    .update({ announced_at: new Date().toISOString() })
    .eq("id", bookId)
    .is("announced_at", null)
    .eq("published", true)
    .select("id, slug, title, author, description, category, cover_url, price_usd");
  const book = (claimed ?? [])[0] as
    | { id: string; slug: string; title: string; author: string | null; description: string | null; category: string; cover_url: string | null; price_usd: number }
    | undefined;
  if (!book) return { alreadyAnnounced: true };

  const recipients = await collectRecipients();
  if (recipients.length === 0) return { sent: 0, skipped: 0 };

  // Price shown in RM (site's home market) with USD alongside
  let priceLabel = `$${Number(book.price_usd).toFixed(2)} USD`;
  try {
    const { getFxRatesUSDBase } = await import("@/lib/fx.server");
    const rate = Number((await getFxRatesUSDBase())["MYR"]);
    if (Number.isFinite(rate) && rate > 0) {
      priceLabel = `RM${(Number(book.price_usd) * rate).toFixed(2)} (≈ $${Number(book.price_usd).toFixed(2)} USD)`;
    }
  } catch { /* USD-only label */ }

  const { sendNewBookAnnouncement } = await import("@/lib/email.server");
  const sent = await sendNewBookAnnouncement(
    recipients.map((r) => ({ email: r.email, name: r.name, unsubUrl: unsubscribeUrl(r.id) })),
    book,
    priceLabel,
  );
  return { sent, skipped: recipients.length - sent };
}
