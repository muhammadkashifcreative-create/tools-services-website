import { createFileRoute } from "@tanstack/react-router";
import { deleteToken, generateToken, storeToken } from "@/lib/auth-tokens.server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit.server";

// Password must be ≥8 chars with at least one uppercase, one digit, and one symbol.
function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return null;
}

// RFC 5322-inspired email validation (stricter than the old regex)
function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(email);
}

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);

          // 5 registration attempts per hour per IP
          const rl = await rateLimit(`register:ip:${ip}`, 5, 3600);
          if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

          const { email, password, name } = (await request.json()) as {
            email?: string;
            password?: string;
            name?: string;
          };
          const normalizedEmail = email?.trim().toLowerCase();

          if (!normalizedEmail || !password)
            return Response.json({ error: "Email and password are required" }, { status: 400 });

          if (!validateEmail(normalizedEmail))
            return Response.json({ error: "Invalid email address" }, { status: 400 });

          const pwErr = validatePassword(password);
          if (pwErr) return Response.json({ error: pwErr }, { status: 400 });

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
                console.error("verification token cleanup error");
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
              { error: "An account with this email already exists. Please login." },
              { status: 409 },
            );
          }

          if (existingUser) {
            // Rate-limit resend per email: 3 times per hour
            const emailRl = await rateLimit(`register:email:${normalizedEmail}`, 3, 3600);
            if (!emailRl.allowed) return rateLimitResponse(emailRl.retryAfter);

            try {
              await sendVerification(existingUser.id);
            } catch (sendError) {
              console.error("verification email resend error");
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

          // Create profile — fail hard so user is not left in a broken state
          const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
            {
              id: userId,
              username: normalizedEmail.split("@")[0],
              full_name: displayName,
            },
            { onConflict: "id" },
          );

          if (profileErr) {
            // Roll back auth user to keep DB consistent
            await supabaseAdmin.auth.admin.deleteUser(userId).catch(console.error);
            return Response.json({ error: "Failed to create account. Please try again." }, { status: 500 });
          }

          // Notify Telegram (non-blocking)
          import("@/lib/telegram.server").then(({ tgSignup }) => {
            tgSignup(normalizedEmail, displayName).catch(console.error);
          });

          try {
            await sendVerification(userId);
          } catch (sendError) {
            console.error("verification email send error");
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (deleteError) console.error("created user cleanup error");
            return emailSendErrorResponse();
          }

          // Do NOT create a session — user must verify email first
          return Response.json({ ok: true, needsVerification: true });
        } catch (e) {
          console.error("register error");
          return Response.json(
            { error: "Registration failed. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
