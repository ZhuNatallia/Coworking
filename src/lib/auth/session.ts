import crypto from "node:crypto";

export const SESSION_COOKIE = "oc_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const DEV_SECRET = "officecare-local-dev-secret-change-me";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("SESSION_SECRET must be set (at least 32 characters) in production");
  }
  return DEV_SECRET;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: now + SESSION_MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; exp: number };
    return typeof uid === "string" && exp > now ? uid : null;
  } catch {
    return null;
  }
}
