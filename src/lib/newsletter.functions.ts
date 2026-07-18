import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Footer "Stay updated" signup — public, no account required. */
export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => z.object({ email: z.string().trim().email().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers" as "profiles")
      .upsert({ email, unsubscribed_at: null } as never, { onConflict: "email" });
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
        throw new Error("Newsletter signup isn't set up yet — please try again later.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });
