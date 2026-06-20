import { createFileRoute } from "@tanstack/react-router";
import { createOAuthState, googleConfig, stateCookie } from "@/lib/direct-google-auth.server";

export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const state = createOAuthState();
          const config = googleConfig(url.origin);
          const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
          authUrl.searchParams.set("client_id", config.clientId);
          authUrl.searchParams.set("redirect_uri", config.redirectUri);
          authUrl.searchParams.set("response_type", "code");
          authUrl.searchParams.set("scope", "openid email profile");
          authUrl.searchParams.set("state", state);
          authUrl.searchParams.set("prompt", "select_account");

          return new Response(null, {
            status: 302,
            headers: {
              location: authUrl.toString(),
              "set-cookie": stateCookie(state),
            },
          });
        } catch (error) {
          console.error(error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Google login is not configured" },
            { status: 500 },
          );
        }
      },
    },
  },
});

