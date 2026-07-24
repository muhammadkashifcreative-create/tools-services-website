import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth, isAdminUser } from "@/lib/direct-auth-middleware.server";
import {
  booksTable,
  bookPurchasesTable,
  bookReviewsTable,
  settleBookPurchase,
  hasQuantityColumn,
  withQuantityCol,
  MAX_QUANTITY,
  type BookPurchaseRow,
} from "@/lib/book-purchases.server";

export type Book = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  description: string | null;
  category: string;
  level: string;
  pages: number | null;
  price_usd: number;
  cover_url: string | null;
  published: boolean;
  sort: number;
  created_at: string;
  language: string | null;
};

/** True when an error is Postgres/PostgREST reporting a missing table or column. */
function isMissingColumn(msg?: string | null): boolean {
  return !!msg && (msg.includes("does not exist") || msg.includes("schema cache"));
}

export type LibraryItem = {
  purchase_id: string;
  book: Pick<Book, "id" | "slug" | "title" | "author" | "category" | "cover_url" | "pages" | "level">;
  amount_usd: number;
  quantity: number;
  paid_at: string | null;
  delivery_status: string;
  download_url: string | null;
};

async function assertAdmin(ctx: { email?: string; userId?: string }) {
  if (!(await isAdminUser(ctx))) throw new Error("Admins only");
}

const PUBLIC_BOOK_COLS = "id, slug, title, author, description, category, level, pages, price_usd, cover_url, published, sort, created_at";

// ---------- Public catalog ----------

export type CatalogBook = Book & { rating_avg: number | null; rating_count: number };

async function ratingSummary(): Promise<Map<string, { avg: number; count: number }>> {
  const summary = new Map<string, { avg: number; count: number }>();
  try {
    const reviews = await bookReviewsTable();
    const { data } = await reviews.select("book_id, rating");
    const agg = new Map<string, { sum: number; count: number }>();
    for (const r of (data ?? []) as Array<{ book_id: string; rating: number }>) {
      const cur = agg.get(r.book_id) ?? { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      agg.set(r.book_id, cur);
    }
    for (const [id, { sum, count }] of agg) summary.set(id, { avg: +(sum / count).toFixed(1), count });
  } catch { /* reviews table missing — no ratings yet */ }
  return summary;
}

export const listBooksPublic = createServerFn({ method: "GET" }).handler(async () => {
  const books = await booksTable();
  const { data, error } = await books
    .select(PUBLIC_BOOK_COLS)
    .eq("published", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    // Table missing = store not set up yet; show an empty catalog, not an error
    if (error.message.includes("does not exist") || error.message.includes("schema cache")) return { books: [] as CatalogBook[] };
    throw new Error(error.message);
  }
  const ratings = await ratingSummary();
  return {
    books: ((data ?? []) as Book[]).map((b) => ({
      ...b,
      rating_avg: ratings.get(b.id)?.avg ?? null,
      rating_count: ratings.get(b.id)?.count ?? 0,
    })) as CatalogBook[],
  };
});

export const getBookBySlugPublic = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const books = await booksTable();
    const selectBook = (cols: string) =>
      books.select(cols).eq("slug", data.slug).eq("published", true).maybeSingle();

    // `language` is a newer column — fall back to the base columns if the
    // migration hasn't run yet so the storefront never 500s.
    let book: Book | null = null;
    const withLang = await selectBook(`${PUBLIC_BOOK_COLS}, language`);
    if (withLang.error) {
      if (isMissingColumn(withLang.error.message)) {
        const base = await selectBook(PUBLIC_BOOK_COLS);
        if (base.error) throw new Error(base.error.message);
        book = base.data ? { ...(base.data as unknown as Book), language: null } : null;
      } else {
        throw new Error(withLang.error.message);
      }
    } else {
      book = (withLang.data ?? null) as Book | null;
    }

    // How many copies have sold — real paid purchases, best-effort. Orders can
    // be for several copies, so this sums quantities rather than counting rows.
    let soldCount = 0;
    if (book) {
      try {
        const purchases = await bookPurchasesTable();
        const { data: sales } = await purchases
          .select(await withQuantityCol("id"))
          .eq("book_id", book.id)
          .eq("status", "paid");
        soldCount = ((sales ?? []) as Array<{ quantity?: number }>).reduce((n, s) => n + (Number(s.quantity ?? 1) || 1), 0);
      } catch { /* purchases unavailable — treat as 0 sold */ }
    }

    return { book, soldCount };
  });

// ---------- Checkout (Stripe Elements, embedded on our own /checkout page) ----------

export type CheckoutBook = { id: string; slug: string; title: string; author: string | null; price_usd: number; cover_url: string | null };

/** What `quantity` copies of a book cost, in USD cents. */
function lineTotalCents(priceUsd: number, quantity: number): number {
  return Math.round(Number(priceUsd) * 100) * quantity;
}

/**
 * Starts (or resumes) checkout for a book: creates the pending purchase row
 * and a Stripe PaymentIntent, returning the client secret our /checkout page
 * mounts Stripe Elements against. Refreshing the checkout page reuses the
 * same pending PaymentIntent instead of creating a new one each time.
 *
 * Buying a book you already own is allowed — customers reorder, and each
 * order is its own purchase row.
 */
export const createBookPaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookId: string; quantity?: number }) =>
    z.object({
      bookId: z.string().uuid(),
      quantity: z.number().int().min(1).max(MAX_QUANTITY).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const books = await booksTable();
    const { data: book, error } = await books
      .select("id, slug, title, author, price_usd, cover_url, published")
      .eq("id", data.bookId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!book || !(book as { published: boolean }).published) throw new Error("This book is not available.");

    const b = book as { id: string; slug: string; title: string; author: string | null; price_usd: number; cover_url: string | null };

    // Quantity rides on a column the admin migrates in — until it exists,
    // checkout stays single-copy rather than charging for copies we can't record.
    const quantityEnabled = await hasQuantityColumn();
    const quantity = quantityEnabled ? (data.quantity ?? 1) : 1;

    // Owning it already doesn't block the sale, but the checkout page says so.
    const purchases = await bookPurchasesTable();
    const { data: owned } = await purchases
      .select("id, refund_status")
      .eq("user_id", context.userId)
      .eq("book_id", b.id)
      .eq("status", "paid")
      .limit(5);
    const alreadyOwned = ((owned ?? []) as Array<{ id: string; refund_status?: string | null }>).some((o) => o.refund_status !== "refunded");

    const { isStripeConfigured, createPaymentIntent, retrievePaymentIntent, updatePaymentIntentAmount } = await import("@/lib/stripe.server");
    if (!isStripeConfigured()) throw new Error("Payments are not configured yet. Please contact support.");

    const amountUsdCents = lineTotalCents(b.price_usd, quantity);
    const email = (context as { email?: string }).email ?? null;
    const checkoutBook = { id: b.id, slug: b.slug, title: b.title, author: b.author, price_usd: b.price_usd, cover_url: b.cover_url } as CheckoutBook;

    // Resume a still-open pending purchase instead of creating a duplicate PaymentIntent.
    const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { data: existing } = await purchases
      .select(await withQuantityCol("id, stripe_payment_intent"))
      .eq("user_id", context.userId)
      .eq("book_id", b.id)
      .eq("status", "pending")
      .gte("created_at", since)
      .not("stripe_payment_intent", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const resumable = existing as { id: string; stripe_payment_intent: string; quantity?: number } | null;

    if (resumable?.stripe_payment_intent) {
      try {
        const intent = await retrievePaymentIntent(resumable.stripe_payment_intent);
        const clientSecret = intent.client_secret; // unchanged by an amount update
        if (clientSecret && !["succeeded", "canceled"].includes(intent.status)) {
          const resumedQty = Number(resumable.quantity ?? 1) || 1;
          let charge = intent.amount;
          // Only touch the amount when the requested count actually differs —
          // reloading the page must not wipe out an applied promo code.
          if (data.quantity != null && data.quantity !== resumedQty) {
            charge = (await updatePaymentIntentAmount(resumable.stripe_payment_intent, amountUsdCents)).amount;
            await purchases
              .update({ amount_usd: charge / 100, ...(quantityEnabled ? { quantity } : {}) })
              .eq("id", resumable.id);
          }
          return {
            clientSecret,
            purchaseId: resumable.id,
            amountUsdCents: charge,
            quantity: data.quantity != null ? quantity : resumedQty,
            quantityEnabled,
            alreadyOwned,
            book: checkoutBook,
          };
        }
      } catch { /* intent gone or expired — fall through and create a fresh one */ }
    }

    const { data: inserted, error: insErr } = await purchases
      .insert({
        user_id: context.userId,
        book_id: b.id,
        amount_usd: amountUsdCents / 100,
        currency: "usd",
        status: "pending",
        ...(quantityEnabled ? { quantity } : {}),
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    const purchaseId = (inserted as { id: string }).id;

    const intent = await createPaymentIntent({
      amountUsdCents,
      customerEmail: email,
      purchaseId,
      userId: context.userId,
      bookId: b.id,
      description: quantity > 1 ? `${b.title} ×${quantity}` : b.title,
    });

    await purchases.update({ stripe_payment_intent: intent.id }).eq("id", purchaseId);
    if (!intent.client_secret) throw new Error("Stripe did not return a client secret.");

    return {
      clientSecret: intent.client_secret,
      purchaseId,
      amountUsdCents: intent.amount,
      quantity,
      quantityEnabled,
      alreadyOwned,
      book: checkoutBook,
    };
  });

/**
 * Changes how many copies the open checkout is for, repricing the pending
 * PaymentIntent. An already-applied promo code is passed back in so the
 * discount survives the change.
 */
export const updateCheckoutQuantity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { purchaseId: string; quantity: number; promoCode?: string }) =>
    z.object({
      purchaseId: z.string().uuid(),
      quantity: z.number().int().min(1).max(MAX_QUANTITY),
      promoCode: z.string().trim().max(60).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { purchase, unitPriceCents } = await loadOpenCheckout(data.purchaseId, context.userId);

    let cents = unitPriceCents * data.quantity;
    if (data.promoCode) cents = await applyPromoDiscount(cents, data.promoCode);

    const { updatePaymentIntentAmount } = await import("@/lib/stripe.server");
    const intent = await updatePaymentIntentAmount(purchase.stripe_payment_intent!, cents);

    const purchases = await bookPurchasesTable();
    await purchases
      .update({ amount_usd: cents / 100, ...((await hasQuantityColumn()) ? { quantity: data.quantity } : {}) })
      .eq("id", purchase.id);

    return { amountUsdCents: intent.amount, quantity: data.quantity };
  });

type OpenCheckout = {
  purchase: { id: string; user_id: string; book_id: string; status: string; stripe_payment_intent: string | null; quantity?: number };
  unitPriceCents: number;
};

/** Loads a pending checkout the caller owns, with its book's list price. */
async function loadOpenCheckout(purchaseId: string, userId: string): Promise<OpenCheckout> {
  const purchases = await bookPurchasesTable();
  const { data: purchase } = await purchases
    .select(await withQuantityCol("id, user_id, book_id, status, stripe_payment_intent"))
    .eq("id", purchaseId)
    .maybeSingle();
  const p = purchase as OpenCheckout["purchase"] | null;
  if (!p || p.user_id !== userId) throw new Error("Checkout session not found.");
  if (p.status !== "pending" || !p.stripe_payment_intent) throw new Error("This checkout session has expired — go back and try again.");

  const books = await booksTable();
  const { data: book } = await books.select("price_usd").eq("id", p.book_id).maybeSingle();
  const unitPriceCents = Math.round(Number((book as { price_usd?: number } | null)?.price_usd ?? 0) * 100);
  if (unitPriceCents <= 0) throw new Error("This book is not available.");

  return { purchase: p, unitPriceCents };
}

/** Validates a Stripe promotion code and returns the discounted total. */
async function applyPromoDiscount(baseCents: number, code: string): Promise<number> {
  const { findPromotionCode } = await import("@/lib/stripe.server");
  const promo = await findPromotionCode(code);
  if (!promo || !promo.active || !promo.coupon.valid) throw new Error("That promo code isn't valid.");

  if (promo.coupon.percent_off != null) {
    return Math.round(baseCents * (1 - promo.coupon.percent_off / 100));
  }
  if (promo.coupon.amount_off != null) {
    return Math.max(50, baseCents - promo.coupon.amount_off); // Stripe's $0.50 minimum charge
  }
  return baseCents;
}

/** Validates a Stripe promotion code and applies the discount to the pending PaymentIntent. */
export const applyCheckoutPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { purchaseId: string; code: string }) =>
    z.object({ purchaseId: z.string().uuid(), code: z.string().trim().min(1).max(60) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { purchase, unitPriceCents } = await loadOpenCheckout(data.purchaseId, context.userId);
    const quantity = Number(purchase.quantity ?? 1) || 1;
    const discounted = await applyPromoDiscount(unitPriceCents * quantity, data.code);

    const { updatePaymentIntentAmount } = await import("@/lib/stripe.server");
    const intent = await updatePaymentIntentAmount(purchase.stripe_payment_intent!, discounted);

    const purchases = await bookPurchasesTable();
    await purchases.update({ amount_usd: discounted / 100 }).eq("id", purchase.id);

    return { amountUsdCents: intent.amount };
  });

/**
 * Webhook-miss safety net: verifies any of the user's recent pending
 * purchases directly against Stripe. Called when the library page loads.
 */
export const reconcileMyPurchases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isStripeConfigured, retrievePaymentIntent } = await import("@/lib/stripe.server");
    if (!isStripeConfigured()) return { settled: 0 };

    const purchases = await bookPurchasesTable();
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: pending } = await purchases
      .select("id, stripe_payment_intent")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .gte("created_at", since)
      .not("stripe_payment_intent", "is", null)
      .limit(10);

    let settled = 0;
    for (const row of (pending ?? []) as Array<{ id: string; stripe_payment_intent: string }>) {
      try {
        const intent = await retrievePaymentIntent(row.stripe_payment_intent);
        const outcome = await settleBookPurchase(intent);
        if (outcome === "granted") settled += 1;
      } catch { /* next reconcile retries */ }
    }
    return { settled };
  });

// ---------- Reviews (text-only, verified buyers) ----------

export type BookReview = {
  id: string;
  rating: number;
  body: string;
  author: string;
  created_at: string;
};

export const listBookReviews = createServerFn({ method: "GET" })
  .inputValidator((d: { bookId: string }) => z.object({ bookId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const reviews = await bookReviewsTable();
      const { data: rows, error } = await reviews
        .select("id, user_id, rating, body, created_at")
        .eq("book_id", data.bookId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const userIds = Array.from(new Set((rows ?? []).map((r: { user_id: string }) => r.user_id)));
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = userIds.length
        ? await supabaseAdmin.from("profiles").select("id, full_name, username").in("id", userIds)
        : { data: [] };
      const nameById = new Map(
        (profiles ?? []).map((p) => [p.id, (p.full_name || p.username || "Verified reader") as string]),
      );

      const list = ((rows ?? []) as Array<{ id: string; user_id: string; rating: number; body: string; created_at: string }>).map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        author: nameById.get(r.user_id) ?? "Verified reader",
        created_at: r.created_at,
      })) as BookReview[];

      const count = list.length;
      const avg = count ? +(list.reduce((s, r) => s + r.rating, 0) / count).toFixed(1) : null;
      return { reviews: list, avg, count };
    } catch {
      // Reviews table missing — behave as "no reviews yet"
      return { reviews: [] as BookReview[], avg: null as number | null, count: 0 };
    }
  });

/** The signed-in user's own review + whether they're allowed to write one. */
export const getMyBookReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookId: string }) => z.object({ bookId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const purchases = await bookPurchasesTable();
    const { data: owned } = await purchases
      .select("id")
      .eq("user_id", context.userId)
      .eq("book_id", data.bookId)
      .eq("status", "paid")
      .limit(1);
    const canReview = Boolean(owned && owned.length > 0);

    let mine: { id: string; rating: number; body: string } | null = null;
    try {
      const reviews = await bookReviewsTable();
      const { data: row } = await reviews
        .select("id, rating, body")
        .eq("book_id", data.bookId)
        .eq("user_id", context.userId)
        .maybeSingle();
      mine = (row ?? null) as { id: string; rating: number; body: string } | null;
    } catch { /* table missing */ }

    return { canReview, mine };
  });

export const upsertMyBookReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookId: string; rating: number; body: string }) =>
    z.object({
      bookId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      body: z.string().trim().min(10, "Please write at least a few words.").max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verified buyers only — a paid purchase of this exact book
    const purchases = await bookPurchasesTable();
    const { data: owned } = await purchases
      .select("id")
      .eq("user_id", context.userId)
      .eq("book_id", data.bookId)
      .eq("status", "paid")
      .limit(1);
    if (!owned || owned.length === 0) {
      throw new Error("Only verified buyers can review this book.");
    }

    const reviews = await bookReviewsTable();
    const { error } = await reviews.upsert(
      {
        book_id: data.bookId,
        user_id: context.userId,
        rating: data.rating,
        body: data.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "book_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Owner can remove their own review; the admin can remove any. */
export const deleteBookReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reviewId: string }) => z.object({ reviewId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const reviews = await bookReviewsTable();
    const isAdmin = await isAdminUser(context);
    let query = reviews.delete().eq("id", data.reviewId);
    if (!isAdmin) query = query.eq("user_id", context.userId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: review moderation ----------

export type AdminReview = {
  id: string;
  book_id: string;
  book_title: string;
  book_slug: string | null;
  rating: number;
  body: string;
  author: string;
  created_at: string;
};

/** Every live review across all books, so the admin can moderate/delete them. */
export const adminListAllReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    try {
      const reviews = await bookReviewsTable();
      const { data: rows, error } = await reviews
        .select("id, book_id, user_id, rating, body, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        if (isMissingColumn(error.message)) return { reviews: [] as AdminReview[] };
        throw error;
      }
      const rl = (rows ?? []) as Array<{ id: string; book_id: string; user_id: string; rating: number; body: string; created_at: string }>;
      if (rl.length === 0) return { reviews: [] as AdminReview[] };

      const bookIds = Array.from(new Set(rl.map((r) => r.book_id)));
      const userIds = Array.from(new Set(rl.map((r) => r.user_id)));

      const books = await booksTable();
      const { data: bookRows } = await books.select("id, title, slug").in("id", bookIds);
      const bookById = new Map((bookRows ?? []).map((b: { id: string; title: string; slug: string }) => [b.id, b]));

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, username").in("id", userIds);
      const nameById = new Map(
        (profiles ?? []).map((p) => [p.id, (p.full_name || p.username || "Verified reader") as string]),
      );

      return {
        reviews: rl.map((r) => ({
          id: r.id,
          book_id: r.book_id,
          book_title: bookById.get(r.book_id)?.title ?? "Removed book",
          book_slug: bookById.get(r.book_id)?.slug ?? null,
          rating: r.rating,
          body: r.body,
          author: nameById.get(r.user_id) ?? "Verified reader",
          created_at: r.created_at,
        })) as AdminReview[],
      };
    } catch {
      return { reviews: [] as AdminReview[] };
    }
  });

// ---------- Library & purchase history ----------

export const getMyLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const purchases = await bookPurchasesTable();
    const BASE_COLS = await withQuantityCol("id, book_id, amount_usd, paid_at, delivery_status, delivered_file_path");
    const runSelect = (cols: string) =>
      purchases.select(cols).eq("user_id", context.userId).eq("status", "paid").order("paid_at", { ascending: false });

    type PurchaseRow = { id: string; book_id: string; amount_usd: number; paid_at: string | null; delivery_status: string; delivered_file_path: string | null; quantity?: number; refund_status?: string | null };
    let rows: PurchaseRow[] = [];
    const withRefund = await runSelect(`${BASE_COLS}, refund_status`);
    if (withRefund.error) {
      if (!isMissingColumn(withRefund.error.message)) throw new Error(withRefund.error.message);
      const base = await runSelect(BASE_COLS);
      if (base.error) {
        if (isMissingColumn(base.error.message)) return { items: [] as LibraryItem[] };
        throw new Error(base.error.message);
      }
      rows = (base.data ?? []) as unknown as PurchaseRow[];
    } else {
      rows = (withRefund.data ?? []) as unknown as PurchaseRow[];
    }

    // A refunded purchase loses library/download access — the sale was reversed.
    rows = rows.filter((r) => r.refund_status !== "refunded");

    const bookIds = Array.from(new Set(rows.map((r) => r.book_id)));
    if (bookIds.length === 0) return { items: [] as LibraryItem[] };

    const books = await booksTable();
    const { data: bookRows } = await books
      .select("id, slug, title, author, category, cover_url, pages, level, file_path")
      .in("id", bookIds);
    const byId = new Map((bookRows ?? []).map((b: { id: string }) => [b.id, b]));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items: LibraryItem[] = [];
    for (const r of rows) {
      const book = byId.get(r.book_id) as (Pick<Book, "id" | "slug" | "title" | "author" | "category" | "cover_url" | "pages" | "level"> & { file_path: string | null }) | undefined;
      if (!book) continue;
      // A per-customer delivered file wins over the book's shared PDF
      const path = r.delivery_status === "delivered" ? (r.delivered_file_path ?? book.file_path) : null;
      let downloadUrl: string | null = null;
      if (path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("book-files")
          .createSignedUrl(path, 3600, { download: true });
        downloadUrl = signed?.signedUrl ?? null;
      }
      const { file_path: _fp, ...pub } = book;
      items.push({
        purchase_id: r.id,
        book: pub,
        amount_usd: Number(r.amount_usd),
        quantity: Number(r.quantity ?? 1) || 1,
        paid_at: r.paid_at,
        delivery_status: r.delivery_status,
        download_url: downloadUrl,
      });
    }
    return { items };
  });

type MyPurchaseRow = BookPurchaseRow & {
  paid_at: string | null;
  delivery_status: string;
  quantity?: number;
  refund_status?: string | null;
  refund_reason?: string | null;
};

export const listMyBookPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const purchases = await bookPurchasesTable();
    const BASE_COLS = await withQuantityCol("id, book_id, amount_usd, status, created_at, paid_at, delivery_status");
    const runSelect = (cols: string) =>
      purchases.select(cols).eq("user_id", context.userId).order("created_at", { ascending: false }).limit(200);

    // Include refund fields when available; fall back if the migration is new.
    let rows: MyPurchaseRow[] = [];
    const withRefund = await runSelect(`${BASE_COLS}, refund_status, refund_reason`);
    if (withRefund.error) {
      if (!isMissingColumn(withRefund.error.message)) throw new Error(withRefund.error.message);
      const base = await runSelect(BASE_COLS);
      if (base.error) {
        if (isMissingColumn(base.error.message)) return [];
        throw new Error(base.error.message);
      }
      rows = (base.data ?? []) as unknown as MyPurchaseRow[];
    } else {
      rows = (withRefund.data ?? []) as unknown as MyPurchaseRow[];
    }

    const bookIds = Array.from(new Set(rows.map((r) => r.book_id)));
    const books = await booksTable();
    const { data: bookRows } = bookIds.length
      ? await books.select("id, title, slug, cover_url").in("id", bookIds)
      : { data: [] };
    const byId = new Map((bookRows ?? []).map((b: { id: string }) => [b.id, b]));
    return rows.map((r) => {
      const b = byId.get(r.book_id) as { title?: string; slug?: string; cover_url?: string | null } | undefined;
      return {
        id: r.id,
        book_title: b?.title ?? "Removed book",
        book_slug: b?.slug ?? null,
        cover_url: b?.cover_url ?? null,
        amount_usd: Number(r.amount_usd),
        quantity: Number(r.quantity ?? 1) || 1,
        status: r.status,
        delivery_status: r.delivery_status,
        refund_status: (r.refund_status ?? "none") as string,
        refund_reason: r.refund_reason ?? null,
        created_at: r.created_at,
        paid_at: r.paid_at,
      };
    });
  });

// ---------- Admin: catalog management ----------

export const adminListBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const books = await booksTable();
    const orderBooks = (cols: string) =>
      books.select(cols).order("sort", { ascending: true }).order("created_at", { ascending: false });

    // Try to include the newer `language` column; degrade gracefully if the
    // migration hasn't run (missing column) or the tables don't exist yet.
    let data: Array<Book & { file_path: string | null }> = [];
    const withLang = await orderBooks(`${PUBLIC_BOOK_COLS}, file_path, language`);
    if (withLang.error) {
      if (!isMissingColumn(withLang.error.message)) throw new Error(withLang.error.message);
      const base = await orderBooks(`${PUBLIC_BOOK_COLS}, file_path`);
      if (base.error) {
        if (isMissingColumn(base.error.message)) {
          return { ready: false, books: [] as Array<Book & { file_path: string | null; sales: number }> };
        }
        throw new Error(base.error.message);
      }
      data = ((base.data ?? []) as unknown as Array<Book & { file_path: string | null }>).map((b) => ({ ...b, language: null }));
    } else {
      data = (withLang.data ?? []) as unknown as Array<Book & { file_path: string | null }>;
    }

    const purchases = await bookPurchasesTable();
    const { data: sales } = await purchases.select(await withQuantityCol("book_id")).eq("status", "paid");
    const counts = new Map<string, number>();
    for (const s of (sales ?? []) as unknown as Array<{ book_id: string; quantity?: number }>) {
      counts.set(s.book_id, (counts.get(s.book_id) ?? 0) + (Number(s.quantity ?? 1) || 1));
    }
    return {
      ready: true,
      books: ((data ?? []) as Array<Book & { file_path: string | null }>).map((b) => ({
        ...b,
        sales: counts.get(b.id) ?? 0,
      })),
    };
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(120).optional(),
  author: z.string().max(120).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().min(1).max(60),
  level: z.string().min(1).max(40),
  language: z.string().max(60).optional().nullable(),
  pages: z.number().int().positive().max(5000).optional().nullable(),
  // Below ~$1 USD, local payment methods Stripe auto-enables (e.g. Malaysia's
  // FPX bank transfer) reject the charge for falling under their own minimum
  // (~RM2), which otherwise surfaces as a confusing error at checkout.
  price_usd: z.number().min(1, "Price must be at least $1.00 USD — lower amounts can fail at checkout for some payment methods.").max(999),
  cover_url: z.string().url().optional().nullable(),
  file_path: z.string().max(300).optional().nullable(),
  published: z.boolean(),
  sort: z.number().int().optional(),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || `book-${Date.now()}`;
}

export const adminUpsertBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof upsertSchema>) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const books = await booksTable();
    const row: Record<string, unknown> = {
      title: data.title,
      slug: data.slug || slugify(data.title),
      author: data.author ?? null,
      description: data.description ?? null,
      category: data.category,
      level: data.level,
      language: data.language ?? null,
      pages: data.pages ?? null,
      price_usd: data.price_usd,
      cover_url: data.cover_url ?? null,
      file_path: data.file_path ?? null,
      published: data.published,
      sort: data.sort ?? 0,
      updated_at: new Date().toISOString(),
    };

    // Save the row; if the `language` column isn't migrated yet, retry without it.
    async function saveRow(r: Record<string, unknown>): Promise<string> {
      if (data.id) {
        const { error } = await books.update(r).eq("id", data.id);
        if (error) throw error;
        return data.id;
      }
      const { data: inserted, error } = await books.insert(r).select("id").single();
      if (error) throw error;
      return (inserted as { id: string }).id;
    }

    let bookId: string;
    try {
      bookId = await saveRow(row);
    } catch (e) {
      const msg = (e as { message?: string }).message;
      if (isMissingColumn(msg) && "language" in row) {
        const { language: _language, ...rowNoLang } = row;
        bookId = await saveRow(rowNoLang);
      } else {
        throw new Error(msg ?? "Failed to save book.");
      }
    }

    // First time this book goes live → newsletter to all subscribed users.
    // announceBook claims books.announced_at, so this only ever happens once.
    let announcement: { sent: number } | { error: string } | null = null;
    if (data.published) {
      try {
        const { announceBook } = await import("@/lib/newsletter.server");
        const result = await announceBook(bookId);
        if (!("alreadyAnnounced" in result)) announcement = { sent: result.sent };
      } catch (e) {
        announcement = { error: (e as Error).message };
      }
    }

    return { ok: true, id: bookId, announcement };
  });

export const adminDeleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const purchases = await bookPurchasesTable();
    const { data: sold } = await purchases.select("id").eq("book_id", data.id).eq("status", "paid").limit(1);
    if (sold && sold.length > 0) {
      // Customers own it — unpublish instead of breaking their library
      const books = await booksTable();
      const { error } = await books.update({ published: false }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, unpublishedInstead: true };
    }
    const books = await booksTable();
    const { error } = await books.delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, unpublishedInstead: false };
  });

/**
 * Returns a one-time signed upload URL so the admin browser can PUT the file
 * straight to Supabase Storage (server functions can't take multi-MB bodies
 * on Vercel). kind "cover" → public bucket, "file" → private PDF bucket.
 */
export const adminCreateUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "cover" | "file"; filename: string }) =>
    z.object({ kind: z.enum(["cover", "file"]), filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = data.kind === "cover" ? "book-covers" : "book-files";
    const ext = (data.filename.split(".").pop() || (data.kind === "cover" ? "png" : "pdf")).toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    let { data: signed, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if (error) {
      // Bucket missing (fresh project) — create it and retry once
      await supabaseAdmin.storage
        .createBucket(bucket, { public: data.kind === "cover" })
        .catch(() => { /* raced another request or lacks permission — retry decides */ });
      ({ data: signed, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path));
    }
    if (error || !signed) throw new Error(`Upload URL failed: ${error?.message ?? "unknown error"}.`);

    const publicUrl =
      data.kind === "cover"
        ? supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl
        : null;
    return { uploadUrl: signed.signedUrl, path, publicUrl };
  });

/**
 * Marks a paid purchase as delivered. If `filePath` is given (a per-customer
 * file uploaded via adminCreateUploadUrl), it becomes that purchase's
 * download; otherwise the book's own PDF is used and must exist.
 */
export const adminDeliverPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { purchaseId: string; filePath?: string | null }) =>
    z.object({ purchaseId: z.string().uuid(), filePath: z.string().max(300).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const purchases = await bookPurchasesTable();
    const { data: purchase, error } = await purchases
      .select("id, user_id, book_id, status, delivery_status")
      .eq("id", data.purchaseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const p = purchase as { id: string; user_id: string; book_id: string; status: string; delivery_status: string } | null;
    if (!p) throw new Error("Purchase not found.");
    if (p.status !== "paid") throw new Error("Only paid purchases can be delivered.");

    const books = await booksTable();
    const { data: book } = await books.select("title, file_path").eq("id", p.book_id).maybeSingle();
    const b = book as { title?: string; file_path?: string | null } | null;
    if (!data.filePath && !b?.file_path) {
      throw new Error("This book has no PDF yet — upload a file to deliver.");
    }

    const { error: updErr } = await purchases
      .update({
        delivery_status: "delivered",
        delivered_file_path: data.filePath ?? null,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    if (updErr) throw new Error(updErr.message);

    // Tell the customer their book is ready — best-effort
    void (async () => {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
        const email = authUser?.user?.email;
        const name = (authUser?.user?.user_metadata as { name?: string } | null)?.name ?? "";
        if (email) {
          const { sendBookDeliveredEmail } = await import("@/lib/email.server");
          await sendBookDeliveredEmail(email, name, b?.title ?? "Your book").catch(console.error);
        }
      } catch { /* notification is best-effort */ }
    })();

    return { ok: true };
  });

/** Emails a paid, delivered customer asking them to leave a review. Skips customers who already reviewed. */
export const adminRequestReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { purchaseId: string }) => z.object({ purchaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const purchases = await bookPurchasesTable();
    const { data: purchase, error } = await purchases
      .select("id, user_id, book_id, status, delivery_status")
      .eq("id", data.purchaseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const p = purchase as { id: string; user_id: string; book_id: string; status: string; delivery_status: string } | null;
    if (!p) throw new Error("Purchase not found.");
    if (p.status !== "paid") throw new Error("Only paid purchases can be asked for a review.");
    if (p.delivery_status !== "delivered") throw new Error("This book hasn't been delivered yet — deliver it first.");

    const reviews = await bookReviewsTable();
    const { data: existingReview } = await reviews
      .select("id")
      .eq("book_id", p.book_id)
      .eq("user_id", p.user_id)
      .maybeSingle();
    if (existingReview) throw new Error("This customer already left a review for this book.");

    const books = await booksTable();
    const { data: book } = await books.select("title, slug").eq("id", p.book_id).maybeSingle();
    const b = book as { title?: string; slug?: string } | null;
    if (!b?.slug) throw new Error("Book not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
    const email = authUser?.user?.email;
    if (!email) throw new Error("Couldn't find this customer's email address.");
    const name = (authUser?.user?.user_metadata as { name?: string } | null)?.name ?? "";

    const { sendReviewRequestEmail } = await import("@/lib/email.server");
    await sendReviewRequestEmail(email, name, b.title ?? "your book", b.slug);

    const { error: updErr } = await purchases
      .update({ review_requested_at: new Date().toISOString() })
      .eq("id", p.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });

// ---------- Admin helpers ----------

export const getStripeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { isStripeConfigured } = await import("@/lib/stripe.server");
    return {
      configured: isStripeConfigured(),
      webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      publishableKeyConfigured: Boolean(process.env.VITE_STRIPE_PUBLISHABLE_KEY),
    };
  });

/** Live USD→MYR rate so admin screens can show and accept prices in RM. */
export const getMyrRate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const { getFxRatesUSDBase } = await import("@/lib/fx.server");
      const rates = await getFxRatesUSDBase();
      const rate = Number(rates["MYR"]);
      if (Number.isFinite(rate) && rate > 0) return { rate };
    } catch { /* fall through to a sane default */ }
    return { rate: 4.7 };
  });
