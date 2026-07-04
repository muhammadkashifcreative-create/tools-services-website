import { createFileRoute } from "@tanstack/react-router";
import {
  clearStateCookie,
  createSessionCookie,
  exchangeGoogleCode,
  readOAuthState,
} from "@/lib/direct-google-auth.server";

async function findOrCreateSupabaseUser(email: string, name?: string, picture?: string): Promise<string | undefined> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Try listing first page only (100 users max) to find by email
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const existing = data?.users?.find((u) => u.email === email);
    const userId = existing
      ? existing.id
      : (await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name, picture },
        })).data?.user?.id;
    if (userId) {
      // Wallet operations require a profiles row — make sure one exists
      const { ensureProfile } = await import("@/lib/balance.server");
      await ensureProfile(userId).catch(console.error);
    }
    return userId;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const expectedState = readOAuthState(request);

        try {
          if (!code || !state || !expectedState || state !== expectedState) {
            throw new Error("Google login state could not be verified");
          }

          const user = await exchangeGoogleCode(url.origin, code);
          // Find or create the Supabase user once at sign-in time
          const supabase_id = await findOrCreateSupabaseUser(user.email, user.name, user.picture);
          const headers = new Headers({
            location: "/dashboard",
            "set-cookie": createSessionCookie({ ...user, supabase_id }),
          });
          headers.append("set-cookie", clearStateCookie());

          return new Response(null, { status: 302, headers });
        } catch (error) {
          console.error(error);
          const headers = new Headers({
            location: `/auth?error=${encodeURIComponent(
              error instanceof Error ? error.message : "Google sign-in failed",
            )}`,
          });
          headers.append("set-cookie", clearStateCookie());
          return new Response(null, { status: 302, headers });
        }
      },
    },
  },
});

