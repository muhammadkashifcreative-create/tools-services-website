## 1. Fix the "numeric field overflow" sync error

Root cause: `services.provider_rate` and `services.rate` are `NUMERIC(12,4)` (max ~99,999,999.9999). With a 100% markup, some Famous Provider rates (high-tier SEO / Google Maps / Spotify packages) push the computed `rate` above that cap and Postgres rejects the insert. The `orders.charge` and `profiles.balance` / `transactions.amount` columns have the same risk once large quantities are ordered.

Migration:
- Widen `services.provider_rate`, `services.rate`, `orders.charge`, `transactions.amount`, `profiles.balance` to `NUMERIC(18,4)`.
- Add safety clamp in `syncServicesFromProvider`: skip/flag rows where the computed rate still exceeds the column, and log a count.
- Also defend against non-numeric `rate`/`min`/`max` strings from the provider (fallback to 0 / 1 / 100000) so a single bad row doesn't abort the whole upsert.

## 2. Premium, professional visual overhaul

Keep the clean SaaS direction but raise it to a polished, "agency-grade" feel. No purple-on-white AI clichés.

Design system updates in `src/styles.css`:
- New palette: deep midnight navy background (`#0B1020`) with electric indigo + cyan accent, soft glass surfaces. Light mode kept crisp white with the same accent.
- Gradient tokens (`--gradient-hero`, `--gradient-card`, `--gradient-accent`) and shadow tokens (`--shadow-glow`, `--shadow-elegant`).
- Typography pair: **Space Grotesk** (display) + **Inter** (body), loaded via `<link>` in `__root.tsx`.

Landing page (`/`) rebuilt as a real marketing page:
- Animated hero with gradient mesh + subtle grid pattern background, headline, dual CTA, trust strip (platform logos as monochrome SVG chips: Instagram, TikTok, YouTube, X, Facebook, LinkedIn, Telegram, Spotify, Twitch, Google).
- Stats band (orders delivered, platforms, avg start time, uptime).
- "Why us" bento grid (6 cards: instant delivery, real engagement, secure payments, 24/7 support, drip-feed, refill guarantee) using MagicUI BorderBeam + MagicCard styles.
- Platform showcase: card per platform with icon, headline, "Followers / Likes / Views / …" pills, "Browse services" link that deep-links into `/services?platform=Instagram`.
- How it works (3 steps), pricing/markup note, FAQ accordion, footer.

App chrome:
- `AppLayout` sidebar refresh: glass nav, gradient logo mark, user balance pill in header, role badge for admins.
- Dashboard cards get gradient borders, sparkline-style stat tiles, recent orders preview.
- Admin page: matching card styling, fixes the "numeric field overflow" toast surface so errors show full message; sync button shows progress + result count.

## 3. Services catalog with full product details

Today `/services` is a flat list. Replace with a real storefront:
- Top filter bar: search, platform dropdown (auto from data), category dropdown, service-type dropdown, sort (price asc/desc, name).
- URL-synced filters via TanStack Router search params so deep links from the landing page work.
- Group view: tabs per platform; inside each, cards grouped by category.
- Each service card shows: platform icon, name, type badge, **full description** (expandable when long), price per 1000 (and a live "price for X" calculator using the min as default), min/max, delivery speed if present, an "Order now" button that opens an order dialog.
- Order dialog: link input + quantity (with min/max + live total), submits via existing `placeOrder` server fn, then routes to `/orders`.
- Empty state with a "Sync catalog" hint for admins; non-empty state shows total service count and last sync time.

Orders page: add status badges with color tokens, quantity progress (start_count vs remains), refresh button calling the existing status check.

## 4. File changes (technical section)

- `supabase/migrations/<new>.sql` — `ALTER TABLE` widen numerics, no data loss.
- `src/styles.css` — new tokens, gradients, shadows, font vars.
- `src/routes/__root.tsx` — Google Fonts `<link>` for Space Grotesk + Inter.
- `src/routes/index.tsx` — full landing page rebuild.
- `src/components/AppLayout.tsx` — sidebar/header polish.
- `src/routes/_authenticated/services.tsx` — storefront UI + filters + order dialog.
- `src/routes/_authenticated/dashboard.tsx` — premium stat cards + recent orders.
- `src/routes/_authenticated/orders.tsx` — status badges, refresh.
- `src/routes/_authenticated/admin.tsx` — card polish, better error surfacing, last-sync timestamp.
- `src/lib/services.functions.ts` — defensive parsing + clamp + return `{ count, skipped }`.
- New small components: `src/components/PlatformIcon.tsx`, `src/components/ServiceCard.tsx`, `src/components/OrderDialog.tsx`, `src/components/marketing/*` (Hero, Bento, Platforms, FAQ).
- Add `bun add framer-motion` for hero/section animations (lucide-react already present for icons).

## Out of scope this round

- Stripe deposits (still demo top-up; wire next round on request).
- Auto-refresh of order status via cron.
- Admin per-service markup override (global markup only for now).
