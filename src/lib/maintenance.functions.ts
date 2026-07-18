import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { readSession } from "@/lib/direct-google-auth.server";
import { requireDirectAuth, isAdminUser } from "@/lib/direct-auth-middleware.server";

const KEY = "maintenance_mode";

// Ship-time default: maintenance is ON until the admin explicitly turns it
// off from the admin panel (the choice is persisted in app_settings and
// survives future deploys).
const DEFAULT_ENABLED = true;

export const getMaintenanceStatus = createServerFn({ method: "GET" }).handler(async () => {
  let enabled = DEFAULT_ENABLED;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", KEY).maybeSingle();
    const v = (data?.value ?? null) as { enabled?: boolean } | null;
    if (v && typeof v.enabled === "boolean") enabled = v.enabled;
  } catch { /* DB unreachable — fall back to default */ }

  // The admin bypasses the maintenance screen so they can verify the site
  let bypass = false;
  try {
    const session = readSession(getRequest());
    if (session?.email) bypass = await isAdminUser({ email: session.email, userId: session.supabase_id });
  } catch { /* not signed in */ }

  return { enabled, bypass };
});

export const setMaintenanceMode = createServerFn({ method: "POST" })
  .middleware([requireDirectAuth])
  .inputValidator((d: { enabled: boolean }) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: KEY,
      value: { enabled: data.enabled } as unknown as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
  });
