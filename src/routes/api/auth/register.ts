import { createFileRoute } from "@tanstack/react-router";
import { createSessionCookie } from "@/lib/direct-google-auth.server";

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

          // Check if email already exists
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())) {
            return Response.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
          }

          // Create Supabase auth user
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password,
            email_confirm: true,
            user_metadata: { name: name?.trim() || email.split("@")[0] },
          });

          if (createErr || !created?.user) {
            return Response.json({ error: createErr?.message ?? "Failed to create account" }, { status: 500 });
          }

          const userId = created.user.id;
          const displayName = name?.trim() || email.split("@")[0];

          // Create profile
          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            username: email.split("@")[0],
            full_name: displayName,
          }, { onConflict: "id" });

          // Session cookie
          const cookie = createSessionCookie({
            sub: userId,
            email: email.toLowerCase(),
            name: displayName,
            supabase_id: userId,
          });

          // Send welcome email (non-blocking)
          import("@/lib/email.server").then(({ sendWelcomeEmail }) => {
            sendWelcomeEmail(email, displayName).catch(console.error);
          });

          return Response.json({ ok: true }, {
            headers: { "set-cookie": cookie },
          });
        } catch (e) {
          console.error("register error", e);
          return Response.json({ error: "Registration failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
