// SMM panel API client — server only.
// Standard SMM panel API: POST form-urlencoded to /api/v2 with `key` + `action`.

const SERVICES_CONN_KEY = "services_api_connection";

type ServicesConn = { api_url: string; api_key: string };

async function getConnection(): Promise<ServicesConn> {
  // Env var takes priority — always works even when DB isn't set up
  const envKey = process.env.SMM_API_KEY ?? process.env.FAMOUSPROVIDER_API_KEY;
  const envUrl = process.env.SMM_API_URL ?? "https://justanotherpanel.com/api/v2";
  if (envKey) return { api_url: envUrl, api_key: envKey };
  // Fall back to DB
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", SERVICES_CONN_KEY)
      .maybeSingle();
    const v = (data?.value ?? null) as ServicesConn | null;
    if (v?.api_url && v?.api_key) return v;
  } catch { /* DB not ready */ }
  throw new Error("Services API key is not configured. Set SMM_API_KEY in Vercel environment variables.");
}

async function call(params: Record<string, string | number>): Promise<unknown> {
  const { api_url, api_key } = await getConnection();
  const body = new URLSearchParams();
  body.set("key", api_key);
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));

  const res = await fetch(api_url, {
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
  average_time?: string | number; // average delivery time in minutes (returned by most SMM panels)
  dripfeed?: boolean;
  refill?: boolean;
  cancel?: boolean;
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