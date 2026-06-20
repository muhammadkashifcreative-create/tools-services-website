// Server-only FX rate fetcher with in-memory cache.
// Source: open.er-api.com (no key, USD base). Falls back to a static table.

const FALLBACK: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.2, CAD: 1.36, AUD: 1.52, JPY: 156, CNY: 7.25,
  BRL: 5.4, MXN: 17.2, ZAR: 18.5, AED: 3.67, SAR: 3.75, TRY: 32.5, RUB: 92, SGD: 1.35,
  CHF: 0.89, SEK: 10.5, NOK: 10.7, DKK: 6.9, PLN: 4.0, NZD: 1.63, HKD: 7.81, KRW: 1370,
  IDR: 16100, MYR: 4.7, PHP: 57, THB: 36, VND: 25400, EGP: 48, NGN: 1500, PKR: 278,
  BDT: 119, LKR: 300, ARS: 950, COP: 4100, CLP: 920, PEN: 3.75, ILS: 3.7, UAH: 40,
  KES: 130, GHS: 14, MAD: 10, DZD: 134, IQD: 1310, JOD: 0.71, KWD: 0.31, QAR: 3.64,
  OMR: 0.38, BHD: 0.38, TWD: 32, RON: 4.6, HUF: 360, CZK: 23, BGN: 1.8, ISK: 138,
};

let cache: { at: number; rates: Record<string, number> } | null = null;

export async function getFxRatesUSDBase(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < 6 * 3600 * 1000) return cache.rates;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const j = (await r.json()) as { rates?: Record<string, number> };
      if (j?.rates && typeof j.rates.INR === "number") {
        cache = { at: Date.now(), rates: { USD: 1, ...j.rates } };
        return cache.rates;
      }
    }
  } catch {
    // ignore — fall through to fallback
  }
  cache = { at: Date.now(), rates: FALLBACK };
  return FALLBACK;
}