import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { readSession } from "@/lib/direct-google-auth.server";

// Read from env var so the admin account can be changed without a code deploy.
// Falls back to the original value so existing deployments keep working.
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "muhammadkashif.creative@gmail.com";

/**
 * Finds a Supabase auth user id by email, paging through the admin user list
 * (covers up to 10k accounts). Only a fallback — sessions issued since the
 * supabase_id cookie fix skip this entirely.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (let page = 1; page <= 10; page++) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (users.length < 1000) return null; // no more pages
  }
  return null;
}

export const requireDirectAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const session = readSession(request);
    if (!session?.email) throw new Error("Unauthorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fast path: supabase_id stored in cookie at sign-in
    if (session.supabase_id) {
      return next({ context: { supabase: supabaseAdmin, userId: session.supabase_id, email: session.email } });
    }

    // Fallback: find/create Supabase user with timeout so it never hangs
    try {
      const result = await Promise.race([
        (async () => {
          const existing = await findUserIdByEmail(session.email);
          if (existing) return existing;
          const { data: created } = await supabaseAdmin.auth.admin.createUser({
            email: session.email,
            email_confirm: true,
            user_metadata: { name: session.name, picture: session.picture },
          });
          if (created?.user?.id) {
            // Wallet operations require a profiles row — make sure one exists
            const { ensureProfile } = await import("@/lib/balance.server");
            await ensureProfile(created.user.id).catch(console.error);
            // First time we see this account — notify admin on Telegram (non-blocking)
            import("@/lib/telegram.server").then(({ tgSignup }) => {
              tgSignup(session.email, session.name ?? session.email.split("@")[0]).catch(console.error);
            });
          }
          return created?.user?.id ?? null;
        })(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);

      if (result) {
        return next({ context: { supabase: supabaseAdmin, userId: result, email: session.email } });
      }
    } catch { /* ignored */ }

    // Last resort: use Google sub as userId — lets the request proceed
    // even if Supabase admin API is unavailable
    return next({ context: { supabase: supabaseAdmin, userId: session.sub, email: session.email } });
  },
);
