import { createFileRoute } from "@tanstack/react-router";
import {
  clearStateCookie,
  createSessionCookie,
  exchangeGoogleCode,
  readOAuthState,
} from "@/lib/direct-google-auth.server";

export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const expectedState = readOAuthState(request);

        try {
          if (!code || !state || !expectedState || state !== expectedState) {
            throw new Error("Google login state could not be verified");
          }

          const user = await exchangeGoogleCode(url.origin, code);
          const headers = new Headers({
            location: "/dashboard",
            "set-cookie": createSessionCookie(user),
          });
          headers.append("set-cookie", clearStateCookie());

          return new Response(null, { status: 302, headers });
        } catch (error) {
          console.error(error);
          const headers = new Headers({
            location: `/auth?error=${encodeURIComponent(
              error instanceof Error ? error.message : "Google sign-in failed",
            )}`,
          });
          headers.append("set-cookie", clearStateCookie());
          return new Response(null, { status: 302, headers });
        }
      },
    },
  },
});

