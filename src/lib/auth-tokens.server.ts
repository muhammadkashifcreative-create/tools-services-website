import { randomBytes, createHash } from "node:crypto";

const VERIFY_TTL = 24 * 60 * 60;  // 24 hours
const RESET_TTL  = 60 * 60;       // 1 hour

export function generateToken() {
  return randomBytes(32).toString("hex");
}

function tokenKey(token: string) {
  const hash = createHash("sha256").update(token).digest("hex").slice(0, 32);
  return `_auth_token_${hash}`;
}

export async function storeToken(
  token: string,
  payload: { userId: string; email: string; type: "verify" | "reset" },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ttl = payload.type === "reset" ? RESET_TTL : VERIFY_TTL;
  await supabaseAdmin.from("app_settings").upsert({
    key: tokenKey(token),
    value: { ...payload, exp: Math.floor(Date.now() / 1000) + ttl },
  });
}

export async function consumeToken(
  token: string,
  type: "verify" | "reset",
): Promise<{ userId: string; email: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const key = tokenKey(token);
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", key).maybeSingle();

  const val = data?.value as { userId?: string; email?: string; type?: string; exp?: number } | null;
  if (!val || val.type !== type || !val.userId || !val.email) return null;
  if (!val.exp || val.exp < Math.floor(Date.now() / 1000)) {
    await supabaseAdmin.from("app_settings").delete().eq("key", key);
    return null;
  }

  // Single-use: delete after reading
  await supabaseAdmin.from("app_settings").delete().eq("key", key);
  return { userId: val.userId, email: val.email };
}
