import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { readSession } from "@/lib/direct-google-auth.server";

// Unified auth middleware.
// Reads the socialpadu_session cookie which now contains the Supabase user ID
// (stored at sign-in time). Zero database calls per request.
export const requireDirectAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const request = getRequest();

    // --- Try Supabase Bearer token first (users with a Supabase session) ---
    const authHeader = request?.headers?.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data, error } = await supabase.auth.getClaims(token);
          if (!error && data?.claims?.sub) {
            return next({ context: { supabase, userId: data.claims.sub } });
          }
        }
      } catch {
        // fall through to cookie auth
      }
    }

    // --- Use the direct Google session cookie ---
    const session = readSession(request);
    if (!session?.email) throw new Error("Unauthorized");

    // Fast path: supabase_id stored in cookie at sign-in time
    if (session.supabase_id) {
      return next({ context: { supabase: supabaseAdmin, userId: session.supabase_id } });
    }

    // Slow fallback: cookie predates supabase_id storage — do a one-time lookup
    // then user should re-login so the cookie is updated with the ID.
    try {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = data?.users?.find((u) => u.email === session.email);
      if (existing) {
        return next({ context: { supabase: supabaseAdmin, userId: existing.id } });
      }
      // Create Supabase user on the fly
      const { data: created } = await supabaseAdmin.auth.admin.createUser({
        email: session.email,
        email_confirm: true,
        user_metadata: { name: session.name, picture: session.picture },
      });
      if (created?.user?.id) {
        return next({ context: { supabase: supabaseAdmin, userId: created.user.id } });
      }
    } catch {
      // ignored
    }

    throw new Error("Unauthorized: please sign out and sign back in");
  },
);
