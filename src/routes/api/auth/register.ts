import { createFileRoute } from "@tanstack/react-router";
import { generateToken, storeToken } from "@/lib/auth-tokens.server";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email, password, name } = (await request.json()) as { email?: string; password?: string; name?: string };

          if (!email || !password) return Response.json({ error: "Email and password are required" }, { status: 400 });
          if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Invalid email address" }, { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Check if email exists
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())) {
            return Response.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
          }

          const displayName = name?.trim() || email.split("@")[0];

          // Create user — NOT yet confirmed (email must be verified)
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password,
            email_confirm: false,
            user_metadata: { name: displayName },
          });

          if (createErr || !created?.user) {
            return Response.json({ error: createErr?.message ?? "Failed to create account" }, { status: 500 });
          }

          const userId = created.user.id;

          // Create profile
          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            username: email.split("@")[0],
            full_name: displayName,
          }, { onConflict: "id" });

          // Generate verification token & send email
          const token = generateToken();
          await storeToken(token, { userId, email: email.toLowerCase(), type: "verify" });

          const origin = new URL(request.url).origin;
          const verifyUrl = `${origin}/api/auth/verify-email?token=${token}`;

          import("@/lib/email.server").then(({ sendVerificationEmail }) => {
            sendVerificationEmail(email, displayName, verifyUrl).catch(console.error);
          });

          // Do NOT create a session — user must verify email first
          return Response.json({ ok: true, needsVerification: true });
        } catch (e) {
          console.error("register error", e);
          return Response.json({ error: "Registration failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
