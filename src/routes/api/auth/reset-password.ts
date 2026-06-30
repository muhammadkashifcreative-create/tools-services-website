import { createFileRoute } from "@tanstack/react-router";
import { consumeToken } from "@/lib/auth-tokens.server";
import { createSessionCookie } from "@/lib/direct-google-auth.server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit.server";

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return null;
}

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);

          // 5 reset attempts per hour per IP
          const rl = await rateLimit(`reset:ip:${ip}`, 5, 3600);
          if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

          const { token, password } = (await request.json()) as { token?: string; password?: string };
          if (!token || !password) return Response.json({ error: "Token and password are required" }, { status: 400 });

          const pwErr = validatePassword(password);
          if (pwErr) return Response.json({ error: pwErr }, { status: 400 });

          const payload = await consumeToken(token, "reset");
          if (!payload) return Response.json({ error: "Reset link has expired or already been used. Please request a new one." }, { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, { password });
          if (error) return Response.json({ error: error.message }, { status: 500 });

          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(payload.userId);
          const name = (authUser?.user?.user_metadata?.name as string | undefined) ?? payload.email.split("@")[0];

          const cookie = createSessionCookie({
            sub: payload.userId,
            email: payload.email,
            name,
            supabase_id: payload.userId,
          });

          return Response.json({ ok: true }, { headers: { "set-cookie": cookie } });
        } catch (e) {
          console.error("reset-password error");
          return Response.json({ error: "Password reset failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
