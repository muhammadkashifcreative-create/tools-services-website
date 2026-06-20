// Famous Provider (SMM panel) API client — server only.
// Standard SMM panel API: POST form-urlencoded to /api/v2 with `key` + `action`.

const API_URL = "https://famousprovider.com/api/v2";

function getKey(): string {
  const key = process.env.FAMOUSPROVIDER_API_KEY;
  if (!key) throw new Error("FAMOUSPROVIDER_API_KEY is not configured");
  return key;
}

async function call(params: Record<string, string | number>): Promise<unknown> {
  const body = new URLSearchParams();
  body.set("key", getKey());
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Provider HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Provider returned non-JSON: ${text.slice(0, 200)}`);
  }
}

export interface ProviderService {
  service: string | number;
  name: string;
  type?: string;
  category?: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  description?: string;
}

export async function fetchServices(): Promise<ProviderService[]> {
  const data = await call({ action: "services" });
  if (!Array.isArray(data)) throw new Error("Unexpected services response");
  return data as ProviderService[];
}

export async function placeOrder(args: {
  service: string | number;
  link: string;
  quantity: number;
}): Promise<{ order: string | number } & Record<string, unknown>> {
  const data = (await call({ action: "add", ...args })) as Record<string, unknown>;
  if (!data || !("order" in data)) throw new Error(`Provider error: ${JSON.stringify(data)}`);
  return data as { order: string | number };
}

export async function orderStatus(orderId: string | number): Promise<{
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
}> {
  const data = (await call({ action: "status", order: orderId })) as Record<string, string>;
  return data;
}

export async function providerBalance(): Promise<{ balance: string; currency: string }> {
  return (await call({ action: "balance" })) as { balance: string; currency: string };
}