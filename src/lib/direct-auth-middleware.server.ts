import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { readSession } from "@/lib/direct-google-auth.server";

// Read from env var so the admin account can be changed without a code deploy.
// Falls back to the original value so existing deployments keep working.
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "muhammadkashif.creative@gmail.com";

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
          const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const existing = data?.users?.find((u) => u.email === session.email);
          if (existing) return existing.id;
          const { data: created } = await supabaseAdmin.auth.admin.createUser({
            email: session.email,
            email_confirm: true,
            user_metadata: { name: session.name, picture: session.picture },
          });
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
