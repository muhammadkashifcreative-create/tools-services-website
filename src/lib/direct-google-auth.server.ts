import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "socialpadu_session";
const STATE_COOKIE = "socialpadu_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 7;

export type GoogleSessionUser = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type SessionPayload = GoogleSessionUser & {
  exp: number;
};

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function authSecret() {
  return process.env.AUTH_SECRET || getEnv("GOOGLE_CLIENT_SECRET");
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cookieOptions(maxAge = MAX_AGE) {
  return `Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function createOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function stateCookie(state: string) {
  return `${STATE_COOKIE}=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`;
}

export function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; ${cookieOptions(0)}`;
}

function parseCookies(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return Object.fromEntries(
    cookie
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export function readOAuthState(request: Request) {
  return parseCookies(request)[STATE_COOKIE];
}

export function createSessionCookie(user: GoogleSessionUser) {
  const payload: SessionPayload = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
  const encoded = base64Url(JSON.stringify(payload));
  return `${SESSION_COOKIE}=${encoded}.${sign(encoded)}; ${cookieOptions()}`;
}

export function readSession(request: Request): GoogleSessionUser | null {
  const raw = parseCookies(request)[SESSION_COOKIE];
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature || !safeEqual(sign(encoded), signature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

export function googleConfig(origin: string) {
  return {
    clientId: getEnv("GOOGLE_CLIENT_ID"),
    clientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: `${origin}/api/auth/google/callback`,
  };
}

export async function exchangeGoogleCode(origin: string, code: string) {
  const config = googleConfig(origin);
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = (await response.json()) as { id_token?: string; error_description?: string; error?: string };
  if (!response.ok || !token.id_token) {
    throw new Error(token.error_description || token.error || "Google sign-in failed");
  }

  const [, payload] = token.id_token.split(".");
  if (!payload) throw new Error("Google did not return a valid identity token");
  const profile = JSON.parse(fromBase64Url(payload)) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!profile.sub || !profile.email || !profile.email_verified) {
    throw new Error("Google account email could not be verified");
  }

  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  };
}

