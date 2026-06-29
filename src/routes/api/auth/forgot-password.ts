import { createFileRoute } from "@tanstack/react-router";
import { generateToken, storeToken } from "@/lib/auth-tokens.server";

export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email } = (await request.json()) as { email?: string };
          if (!email) return Response.json({ error: "Email is required" }, { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Find user — always return success to prevent email enumeration
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const user = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

          if (user) {
            const token = generateToken();
            await storeToken(token, { userId: user.id, email: user.email!, type: "reset" });

            const origin = new URL(request.url).origin;
            const resetUrl = `${origin}/auth?mode=reset&token=${token}`;
            const name = (user.user_metadata?.name as string | undefined) ?? email.split("@")[0];

            try {
              const { sendPasswordResetEmail } = await import("@/lib/email.server");
              await sendPasswordResetEmail(user.email!, name, resetUrl);
            } catch (sendError) {
              console.error("password reset email send error", sendError);
            }
          }

          // Always return ok (don't reveal if email exists)
          return Response.json({ ok: true });
        } catch (e) {
          console.error("forgot-password error", e);
          return Response.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
