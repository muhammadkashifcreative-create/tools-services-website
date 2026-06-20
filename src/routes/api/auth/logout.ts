import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie } from "@/lib/direct-google-auth.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () =>
        Response.json(
          { ok: true },
          {
            headers: {
              "set-cookie": clearSessionCookie(),
            },
          },
        ),
    },
  },
});

