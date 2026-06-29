import { createFileRoute } from "@tanstack/react-router";
import { consumeToken } from "@/lib/auth-tokens.server";
import { createSessionCookie } from "@/lib/direct-google-auth.server";

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { token, password } = (await request.json()) as { token?: string; password?: string };
          if (!token || !password) return Response.json({ error: "Token and password are required" }, { status: 400 });
          if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });

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
          console.error("reset-password error", e);
          return Response.json({ error: "Password reset failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
