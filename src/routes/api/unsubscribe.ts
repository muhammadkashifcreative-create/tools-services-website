import { createFileRoute } from "@tanstack/react-router";

/**
 * One-click unsubscribe from promotional emails. Links carry an HMAC token
 * so only the recipient of the email can flip their own flag.
 */
export const Route = createFileRoute("/api/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const userId = url.searchParams.get("u") ?? "";
        const subscriberId = url.searchParams.get("s") ?? "";
        const id = userId || subscriberId;
        const token = url.searchParams.get("t") ?? "";

        const page = (title: string, message: string) =>
          new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(160deg,#fff3e8,#fef9f5);">
<div style="max-width:420px;text-align:center;padding:40px;background:#fff;border-radius:20px;box-shadow:0 10px 40px rgba(224,123,46,0.12);">
<h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">${title}</h1>
<p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;">${message}</p>
<a href="https://www.socialpadu.my" style="display:inline-block;margin-top:22px;padding:12px 28px;border-radius:50px;background:linear-gradient(135deg,#e07b2e,#c8621f);color:#fff;font-size:14px;font-weight:700;text-decoration:none;">Back to Social Padu</a>
</div></body></html>`,
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );

        const { verifyUnsubscribeToken } = await import("@/lib/newsletter.server");
        if (!id || !token || !verifyUnsubscribeToken(id, token)) {
          return page("Link not valid", "This unsubscribe link is invalid or has expired. If you keep receiving emails you don't want, contact socialpadu@gmail.com.");
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          if (userId) {
            await supabaseAdmin
              .from("profiles")
              .update({ marketing_opt_out: true } as never)
              .eq("id", userId);
          } else {
            await supabaseAdmin
              .from("newsletter_subscribers" as "profiles")
              .update({ unsubscribed_at: new Date().toISOString() } as never)
              .eq("id", subscriberId);
          }
        } catch {
          return page("Something went wrong", "We couldn't update your preference just now. Please try the link again later or contact socialpadu@gmail.com.");
        }

        return page("You're unsubscribed", "You won't receive new-book announcements anymore. Account emails (receipts, deliveries, support replies) still arrive as usual.");
      },
    },
  },
});
