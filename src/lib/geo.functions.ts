import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

// Country → currency + symbol (covers most populated countries).
const COUNTRY_CCY: Record<string, { c: string; s: string }> = {
  US: { c: "USD", s: "$" }, CA: { c: "CAD", s: "C$" }, MX: { c: "MXN", s: "MX$" },
  GB: { c: "GBP", s: "£" }, IE: { c: "EUR", s: "€" }, FR: { c: "EUR", s: "€" },
  DE: { c: "EUR", s: "€" }, ES: { c: "EUR", s: "€" }, IT: { c: "EUR", s: "€" },
  NL: { c: "EUR", s: "€" }, BE: { c: "EUR", s: "€" }, AT: { c: "EUR", s: "€" },
  PT: { c: "EUR", s: "€" }, GR: { c: "EUR", s: "€" }, FI: { c: "EUR", s: "€" },
  LU: { c: "EUR", s: "€" }, SK: { c: "EUR", s: "€" }, SI: { c: "EUR", s: "€" },
  EE: { c: "EUR", s: "€" }, LV: { c: "EUR", s: "€" }, LT: { c: "EUR", s: "€" },
  CY: { c: "EUR", s: "€" }, MT: { c: "EUR", s: "€" }, HR: { c: "EUR", s: "€" },
  CH: { c: "CHF", s: "CHF" }, SE: { c: "SEK", s: "kr" }, NO: { c: "NOK", s: "kr" },
  DK: { c: "DKK", s: "kr" }, PL: { c: "PLN", s: "zł" }, CZ: { c: "CZK", s: "Kč" },
  HU: { c: "HUF", s: "Ft" }, RO: { c: "RON", s: "lei" }, BG: { c: "BGN", s: "лв" },
  IS: { c: "ISK", s: "kr" }, TR: { c: "TRY", s: "₺" }, RU: { c: "RUB", s: "₽" },
  UA: { c: "UAH", s: "₴" }, IL: { c: "ILS", s: "₪" },
  AE: { c: "AED", s: "د.إ" }, SA: { c: "SAR", s: "﷼" }, QA: { c: "QAR", s: "﷼" },
  KW: { c: "KWD", s: "د.ك" }, OM: { c: "OMR", s: "﷼" }, BH: { c: "BHD", s: ".د.ب" },
  JO: { c: "JOD", s: "د.أ" }, EG: { c: "EGP", s: "E£" }, MA: { c: "MAD", s: "د.م." },
  DZ: { c: "DZD", s: "د.ج" }, NG: { c: "NGN", s: "₦" }, KE: { c: "KES", s: "KSh" },
  GH: { c: "GHS", s: "₵" }, ZA: { c: "ZAR", s: "R" },
  IN: { c: "INR", s: "₹" }, PK: { c: "PKR", s: "₨" }, BD: { c: "BDT", s: "৳" },
  LK: { c: "LKR", s: "Rs" }, NP: { c: "INR", s: "₹" },
  CN: { c: "CNY", s: "¥" }, HK: { c: "HKD", s: "HK$" }, TW: { c: "TWD", s: "NT$" },
  JP: { c: "JPY", s: "¥" }, KR: { c: "KRW", s: "₩" }, SG: { c: "SGD", s: "S$" },
  MY: { c: "MYR", s: "RM" }, ID: { c: "IDR", s: "Rp" }, PH: { c: "PHP", s: "₱" },
  TH: { c: "THB", s: "฿" }, VN: { c: "VND", s: "₫" },
  AU: { c: "AUD", s: "A$" }, NZ: { c: "NZD", s: "NZ$" },
  BR: { c: "BRL", s: "R$" }, AR: { c: "ARS", s: "$" }, CL: { c: "CLP", s: "$" },
  CO: { c: "COP", s: "$" }, PE: { c: "PEN", s: "S/." },
};

function detectCountry(req: Request): string {
  const h = req.headers;
  const c =
    h.get("cf-ipcountry") ||
    h.get("x-vercel-ip-country") ||
    h.get("x-country-code") ||
    h.get("x-geo-country") ||
    "";
  return (c || "US").toUpperCase().slice(0, 2);
}

export const getUserCurrency = createServerFn({ method: "GET" }).handler(async () => {
  const { getFxRatesUSDBase } = await import("./fx.server");
  const req = getRequest();
  const country = detectCountry(req);
  const meta = COUNTRY_CCY[country] ?? { c: "USD", s: "$" };
  const rates = await getFxRatesUSDBase();
  const rate = Number(rates[meta.c]) || 1;
  return { country, currency: meta.c, symbol: meta.s, rate };
});