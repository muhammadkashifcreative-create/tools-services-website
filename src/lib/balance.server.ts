/**
 * Guarantees a `profiles` row exists for the given auth user.
 * No-op if the profile is already there.
 */
export async function ensureProfile(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  let email: string | null = null;
  let name: string | null = null;
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    email = authUser?.user?.email ?? null;
    name = (authUser?.user?.user_metadata as { name?: string } | null)?.name ?? null;
  } catch { /* profile still gets created with defaults */ }

  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      username: email ? email.split("@")[0] : null,
      full_name: name,
    },
    { onConflict: "id" },
  );
  if (error) console.error("ensureProfile failed:", error.message);
}
