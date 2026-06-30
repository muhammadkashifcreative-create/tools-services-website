import { createFileRoute } from "@tanstack/react-router";
import { consumeToken } from "@/lib/auth-tokens.server";
import { createSessionCookie } from "@/lib/direct-google-auth.server";
import { rateLimit, getClientIp } from "@/lib/rate-limit.server";

export const Route = createFileRoute("/api/auth/verify-email")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token");
        if (!token) return Response.redirect(new URL("/auth?error=Invalid+verification+link", request.url));

        // 20 verification attempts per hour per IP — blocks token brute-force
        const ip = getClientIp(request);
        const rl = await rateLimit(`verify:ip:${ip}`, 20, 3600);
        if (!rl.allowed) {
          return Response.redirect(new URL("/auth?error=Too+many+attempts.+Please+try+again+later.", request.url));
        }

        try {
          const payload = await consumeToken(token, "verify");
          if (!payload) return Response.redirect(new URL("/auth?error=Verification+link+expired+or+already+used", request.url));

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Confirm email in Supabase
          await supabaseAdmin.auth.admin.updateUserById(payload.userId, { email_confirm: true });

          // Get user info for session
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(payload.userId);
          const name = (authUser?.user?.user_metadata?.name as string | undefined) ?? payload.email.split("@")[0];

          const cookie = createSessionCookie({
            sub: payload.userId,
            email: payload.email,
            name,
            supabase_id: payload.userId,
          });

          return new Response(null, {
            status: 302,
            headers: { location: "/dashboard?verified=1", "set-cookie": cookie },
          });
        } catch (e) {
          console.error("verify-email error");
          return Response.redirect(new URL("/auth?error=Verification+failed.+Please+try+again.", request.url));
        }
      },
    },
  },
});
