// Supabase-backed sliding-window rate limiter.
// Uses the app_settings table — no extra infrastructure needed.
// Not perfectly atomic under extreme concurrency, but sufficient for auth endpoints.

type RlRecord = { count: number; window_start: number };

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dbKey = `rl:${key}`;
    const now = Math.floor(Date.now() / 1000);

    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", dbKey)
      .maybeSingle();

    const current = data?.value as RlRecord | null;

    if (!current || now - current.window_start >= windowSeconds) {
      await supabaseAdmin.from("app_settings").upsert({
        key: dbKey,
        value: { count: 1, window_start: now } satisfies RlRecord,
      });
      return { allowed: true };
    }

    if (current.count >= maxRequests) {
      const retryAfter = windowSeconds - (now - current.window_start);
      return { allowed: false, retryAfter };
    }

    await supabaseAdmin
      .from("app_settings")
      .update({ value: { count: current.count + 1, window_start: current.window_start } satisfies RlRecord })
      .eq("key", dbKey);

    return { allowed: true };
  } catch {
    // If rate limit check fails, allow the request rather than blocking legitimate users
    return { allowed: true };
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function rateLimitResponse(retryAfter?: number): Response {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : {},
    },
  );
}
