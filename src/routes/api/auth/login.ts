import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createSessionCookie } from "@/lib/direct-google-auth.server";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email, password } = (await request.json()) as { email?: string; password?: string };

          if (!email || !password) return Response.json({ error: "Email and password are required" }, { status: 400 });

          const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
          const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

          if (!supabaseUrl || !supabaseAnonKey) {
            return Response.json({ error: "Auth service not configured" }, { status: 500 });
          }

          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password,
          });

          if (error || !data?.user) {
            return Response.json({ error: "Incorrect email or password" }, { status: 401 });
          }

          const user = data.user;
          const displayName = (user.user_metadata?.name as string | undefined) ?? email.split("@")[0];

          const cookie = createSessionCookie({
            sub: user.id,
            email: user.email ?? email.toLowerCase(),
            name: displayName,
            supabase_id: user.id,
          });

          return Response.json({ ok: true }, {
            headers: { "set-cookie": cookie },
          });
        } catch (e) {
          console.error("login error", e);
          return Response.json({ error: "Sign in failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
