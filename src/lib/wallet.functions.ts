import { createServerFn } from "@tanstack/react-start";
import { requireDirectAuth as requireSupabaseAuth, isAdminUser } from "@/lib/direct-auth-middleware.server";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let profile: { id: string; username: string | null; full_name: string | null; balance: number } | null = null;
    try {
      const { data } = await context.supabase
        .from("profiles")
        .select("id, username, full_name, balance")
        .eq("id", context.userId)
        .maybeSingle();
      profile = data ?? null;
    } catch { /* DB not ready yet — proceed with defaults */ }

    return {
      ...(profile ?? { id: context.userId, username: null, full_name: null, balance: 0 }),
      isAdmin: await isAdminUser(context),
      email: (context as { email?: string }).email ?? null,
    };
  });

