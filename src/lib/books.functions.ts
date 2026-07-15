import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth, ADMIN_EMAIL } from "@/lib/direct-auth-middleware.server";
import { booksTable, bookPurchasesTable, settleBookPurchase, type BookPurchaseRow } from "@/lib/book-purchases.server";

const SITE_URL = process.env.SITE_URL ?? "https://www.socialpadu.my";

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
};

export type LibraryItem = {
  purchase_id: string;
  book: Pick<Book, "id" | "slug" | "title" | "author" | "category" | "cover_url" | "pages" | "level">;
  amount_usd: number;
  paid_at: string | null;
  delivery_status: string;
  download_url: string | null;
};

function assertAdmin(ctx: { email?: string }) {
  if ((ctx as { email?: string }).email !== ADMIN_EMAIL) throw new Error("Admins only");
}

const PUBLIC_BOOK_COLS = "id, slug, title, author, description, category, level, pages, price_usd, cover_url, published, sort, created_at";

// ---------- Public catalog ----------

export const listBooksPublic = createServerFn({ method: "GET" }).handler(async () => {
  const books = await booksTable();
  const { data, error } = await books
    .select(PUBLIC_BOOK_COLS)
    .eq("published", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    // Table missing = store not set up yet; show an empty catalog, not an error
    if (error.message.includes("does not exist") || error.message.includes("schema cache")) return { books: [] as Book[] };
    throw new Error(error.message);
  }
  return { books: (data ?? []) as Book[] };
});

export const getBookBySlugPublic = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const books = await booksTable();
    const { data: book, error } = await books
      .select(PUBLIC_BOOK_COLS)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { book: (book ?? null) as Book | null };
  });

// ---------- Checkout (Stripe) ----------

export const createBookCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookId: string }) => z.object({ bookId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const books = await booksTable();
    const { data: book, error } = await books
      .select("id, slug, title, price_usd, cover_url, published")
      .eq("id", data.bookId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!book || !(book as { published: boolean }).published) throw new Error("This book is not available.");

    const b = book as { id: string; slug: string; title: string; price_usd: number; cover_url: string | null };

    // Already owned? Don't charge twice.
    const purchases = await bookPurchasesTable();
    const { data: owned } = await purchases
      .select("id")
      .eq("user_id", context.userId)
      .eq("book_id", b.id)
      .eq("status", "paid")
      .limit(1);
    if (owned && owned.length > 0) throw new Error("You already own this book — find it in your Library.");

    const { data: inserted, error: insErr } = await purchases
      .insert({
        user_id: context.userId,
        book_id: b.id,
        amount_usd: Number(b.price_usd),
        currency: "usd",
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    const purchaseId = (inserted as { id: string }).id;

    const { createCheckoutSession } = await import("@/lib/stripe.server");
    const session = await createCheckoutSession({
      bookTitle: b.title,
      amountUsdCents: Math.round(Number(b.price_usd) * 100),
      coverUrl: b.cover_url,
      customerEmail: (context as { email?: string }).email ?? null,
      purchaseId,
      userId: context.userId,
      bookId: b.id,
      successUrl: `${SITE_URL}/dashboard/library?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${SITE_URL}/books/${b.slug}?canceled=1`,
    });

    await purchases.update({ stripe_session_id: session.id }).eq("id", purchaseId);
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { checkoutUrl: session.url };
  });

/**
 * Webhook-miss safety net: verifies any of the user's recent pending
 * purchases directly against Stripe. Called when the library page loads.
 */
export const reconcileMyPurchases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isStripeConfigured, retrieveCheckoutSession } = await import("@/lib/stripe.server");
    if (!isStripeConfigured()) return { settled: 0 };

    const purchases = await bookPurchasesTable();
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: pending } = await purchases
      .select("id, stripe_session_id")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .gte("created_at", since)
      .not("stripe_session_id", "is", null)
      .limit(10);

    let settled = 0;
    for (const row of (pending ?? []) as Array<{ id: string; stripe_session_id: string }>) {
      try {
        const session = await retrieveCheckoutSession(row.stripe_session_id);
        const outcome = await settleBookPurchase(session);
        if (outcome === "granted") settled += 1;
      } catch { /* next reconcile retries */ }
    }
    return { settled };
  });

// ---------- Library & purchase history ----------

export const getMyLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const purchases = await bookPurchasesTable();
    const { data: rows, error } = await purchases
      .select("id, book_id, amount_usd, paid_at, delivery_status, delivered_file_path")
      .eq("user_id", context.userId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false });
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) return { items: [] as LibraryItem[] };
      throw new Error(error.message);
    }

    const bookIds = Array.from(new Set((rows ?? []).map((r: { book_id: string }) => r.book_id)));
    if (bookIds.length === 0) return { items: [] as LibraryItem[] };

    const books = await booksTable();
    const { data: bookRows } = await books
      .select("id, slug, title, author, category, cover_url, pages, level, file_path")
      .in("id", bookIds);
    const byId = new Map((bookRows ?? []).map((b: { id: string }) => [b.id, b]));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items: LibraryItem[] = [];
    type PurchaseRow = { id: string; book_id: string; amount_usd: number; paid_at: string | null; delivery_status: string; delivered_file_path: string | null };
    for (const r of (rows ?? []) as PurchaseRow[]) {
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
        paid_at: r.paid_at,
        delivery_status: r.delivery_status,
        download_url: downloadUrl,
      });
    }
    return { items };
  });

export const listMyBookPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const purchases = await bookPurchasesTable();
    const { data: rows, error } = await purchases
      .select("id, book_id, amount_usd, status, created_at, paid_at, delivery_status")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) return [];
      throw new Error(error.message);
    }
    const bookIds = Array.from(new Set((rows ?? []).map((r: { book_id: string }) => r.book_id)));
    const books = await booksTable();
    const { data: bookRows } = bookIds.length
      ? await books.select("id, title, slug, cover_url").in("id", bookIds)
      : { data: [] };
    const byId = new Map((bookRows ?? []).map((b: { id: string }) => [b.id, b]));
    return ((rows ?? []) as Array<BookPurchaseRow & { paid_at: string | null; delivery_status: string }>).map((r) => {
      const b = byId.get(r.book_id) as { title?: string; slug?: string; cover_url?: string | null } | undefined;
      return {
        id: r.id,
        book_title: b?.title ?? "Removed book",
        book_slug: b?.slug ?? null,
        cover_url: b?.cover_url ?? null,
        amount_usd: Number(r.amount_usd),
        status: r.status,
        delivery_status: r.delivery_status,
        created_at: r.created_at,
        paid_at: r.paid_at,
      };
    });
  });

// ---------- Admin: catalog management ----------

export const adminListBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context);
    const books = await booksTable();
    const { data, error } = await books
      .select(`${PUBLIC_BOOK_COLS}, file_path`)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
        return { ready: false, books: [] as Array<Book & { file_path: string | null; sales: number }> };
      }
      throw new Error(error.message);
    }

    const purchases = await bookPurchasesTable();
    const { data: sales } = await purchases.select("book_id").eq("status", "paid");
    const counts = new Map<string, number>();
    for (const s of (sales ?? []) as Array<{ book_id: string }>) {
      counts.set(s.book_id, (counts.get(s.book_id) ?? 0) + 1);
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
  pages: z.number().int().positive().max(5000).optional().nullable(),
  price_usd: z.number().positive().max(999),
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
    assertAdmin(context);
    const books = await booksTable();
    const row = {
      title: data.title,
      slug: data.slug || slugify(data.title),
      author: data.author ?? null,
      description: data.description ?? null,
      category: data.category,
      level: data.level,
      pages: data.pages ?? null,
      price_usd: data.price_usd,
      cover_url: data.cover_url ?? null,
      file_path: data.file_path ?? null,
      published: data.published,
      sort: data.sort ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await books.update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await books.insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (inserted as { id: string }).id };
  });

export const adminDeleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    assertAdmin(context);
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
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = data.kind === "cover" ? "book-covers" : "book-files";
    const ext = (data.filename.split(".").pop() || (data.kind === "cover" ? "png" : "pdf")).toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data: signed, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw new Error(`Upload URL failed: ${error.message}. Run the books migration first (Admin → Check Database).`);

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
    assertAdmin(context);
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

// ---------- Admin helpers ----------

export const getStripeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context);
    const { isStripeConfigured } = await import("@/lib/stripe.server");
    return { configured: isStripeConfigured(), webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET) };
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
