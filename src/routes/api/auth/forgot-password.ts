import { createFileRoute } from "@tanstack/react-router";
import { generateToken, storeToken } from "@/lib/auth-tokens.server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit.server";

export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          const { email } = (await request.json()) as { email?: string };
          if (!email) return Response.json({ error: "Email is required" }, { status: 400 });

          const normalizedEmail = email.toLowerCase().trim();

          // 3 reset requests per hour per IP and per email — prevents inbox flooding
          const [ipRl, emailRl] = await Promise.all([
            rateLimit(`forgot:ip:${ip}`, 3, 3600),
            rateLimit(`forgot:email:${normalizedEmail}`, 3, 3600),
          ]);
          if (!ipRl.allowed || !emailRl.allowed) {
            // Always return success shape to prevent email enumeration via rate-limit responses
            return Response.json({ ok: true });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Minimum response time to mitigate timing-based email enumeration
          const minDelay = new Promise((r) => setTimeout(r, 300));

          const sendReset = async () => {
            const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const user = list?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

            if (user) {
              const token = generateToken();
              await storeToken(token, { userId: user.id, email: user.email!, type: "reset" });

              const origin = new URL(request.url).origin;
              const resetUrl = `${origin}/auth?mode=reset&token=${token}`;
              const name = (user.user_metadata?.name as string | undefined) ?? normalizedEmail.split("@")[0];

              try {
                const { sendPasswordResetEmail } = await import("@/lib/email.server");
                await sendPasswordResetEmail(user.email!, name, resetUrl);
              } catch (sendError) {
                console.error("password reset email send error:", sendError);
              }
            }
          };

          // Run email lookup + minDelay in parallel so response time is always ≥300ms
          await Promise.all([sendReset(), minDelay]);

          // Always return ok (don't reveal if email exists)
          return Response.json({ ok: true });
        } catch (e) {
          console.error("forgot-password error");
          return Response.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
