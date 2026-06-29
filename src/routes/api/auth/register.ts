import { createFileRoute } from "@tanstack/react-router";
import { deleteToken, generateToken, storeToken } from "@/lib/auth-tokens.server";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email, password, name } = (await request.json()) as {
            email?: string;
            password?: string;
            name?: string;
          };
          const normalizedEmail = email?.trim().toLowerCase();

          if (!normalizedEmail || !password)
            return Response.json({ error: "Email and password are required" }, { status: 400 });
          if (password.length < 8)
            return Response.json(
              { error: "Password must be at least 8 characters" },
              { status: 400 },
            );
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
            return Response.json({ error: "Invalid email address" }, { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const displayName = name?.trim() || normalizedEmail.split("@")[0];

          const sendVerification = async (userId: string) => {
            const token = generateToken();
            await storeToken(token, { userId, email: normalizedEmail, type: "verify" });

            const origin = new URL(request.url).origin;
            const verifyUrl = `${origin}/api/auth/verify-email?token=${token}`;
            const { sendVerificationEmail } = await import("@/lib/email.server");

            try {
              await sendVerificationEmail(normalizedEmail, displayName, verifyUrl);
            } catch (error) {
              await deleteToken(token).catch((deleteError) => {
                console.error("verification token cleanup error", deleteError);
              });
              throw error;
            }
          };

          const emailSendErrorResponse = () =>
            Response.json(
              {
                error:
                  "We could not send the verification email. Please try again in a few minutes or contact support.",
              },
              { status: 502 },
            );

          // Check if email exists
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const existingUser = list?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

          if (existingUser?.email_confirmed_at) {
            return Response.json(
              { error: "An account with this email already exists. Please sign in." },
              { status: 409 },
            );
          }

          if (existingUser) {
            try {
              await sendVerification(existingUser.id);
            } catch (sendError) {
              console.error("verification email resend error", sendError);
              return emailSendErrorResponse();
            }

            return Response.json({ ok: true, needsVerification: true });
          }

          // Create user — NOT yet confirmed (email must be verified)
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: false,
            user_metadata: { name: displayName },
          });

          if (createErr || !created?.user) {
            return Response.json(
              { error: createErr?.message ?? "Failed to create account" },
              { status: 500 },
            );
          }

          const userId = created.user.id;

          // Create profile
          await supabaseAdmin.from("profiles").upsert(
            {
              id: userId,
              username: normalizedEmail.split("@")[0],
              full_name: displayName,
            },
            { onConflict: "id" },
          );

          try {
            await sendVerification(userId);
          } catch (sendError) {
            console.error("verification email send error", sendError);
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (deleteError) console.error("created user cleanup error", deleteError);
            return emailSendErrorResponse();
          }

          // Do NOT create a session — user must verify email first
          return Response.json({ ok: true, needsVerification: true });
        } catch (e) {
          console.error("register error", e);
          return Response.json(
            { error: "Registration failed. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
