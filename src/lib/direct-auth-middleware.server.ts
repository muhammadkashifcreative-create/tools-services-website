import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { readSession } from "@/lib/direct-google-auth.server";

// Unified auth middleware that works with the direct Google OAuth session cookie.
// Falls back to Supabase Bearer token for clients that have a Supabase session.
export const requireDirectAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const request = getRequest();

    // --- Try Supabase Bearer token first ---
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

    // --- Fall back to direct Google session cookie ---
    const session = readSession(request);
    if (!session?.email) throw new Error("Unauthorized");

    // Find or create the Supabase user by email
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    let supabaseUser = listData?.users?.find((u) => u.email === session.email);

    if (!supabaseUser) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: session.email,
        email_confirm: true,
        user_metadata: {
          name: session.name,
          picture: session.picture,
          google_sub: session.sub,
        },
      });
      if (error || !created?.user) throw new Error("Failed to create user account");
      supabaseUser = created.user;
    }

    return next({ context: { supabase: supabaseAdmin, userId: supabaseUser.id } });
  },
);
