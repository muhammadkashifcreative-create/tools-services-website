import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://www.socialpadu.my";

const STATIC_PATHS = ["/", "/books", "/about", "/contact", "/terms", "/privacy", "/refund"];

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: Array<{ loc: string; lastmod?: string }> = STATIC_PATHS.map((p) => ({ loc: `${BASE_URL}${p}` }));

        try {
          const { booksTable } = await import("@/lib/book-purchases.server");
          const books = await booksTable();
          const { data } = await books.select("slug, updated_at").eq("published", true);
          for (const b of (data ?? []) as Array<{ slug: string; updated_at: string | null }>) {
            urls.push({ loc: `${BASE_URL}/books/${b.slug}`, lastmod: b.updated_at ?? undefined });
          }
        } catch { /* books table unavailable — ship the static pages only */ }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;

        return new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
