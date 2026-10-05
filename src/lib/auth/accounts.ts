import { backend, db, newId, nowISO } from "@/lib/db";
import { localStore } from "@/lib/db/local-store";
import { supabaseAdmin, supabaseAnon } from "@/lib/db/supabase-store";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import type { T } from "@/lib/i18n/core";
import type { Profile, Role } from "@/lib/types";
import { hashPassword, verifyPassword } from "./passwords";

export const MIN_PASSWORD_LENGTH = 8;

export type AccountErrorCode = "passwordShort" | "emailTaken" | "createFailed" | "provider";

/** `message` carries the auth provider's own text for the "provider" code. */
export class AccountError extends Error {
  constructor(
    readonly code: AccountErrorCode,
    message: string = code,
  ) {
    super(message);
  }
}

export function accountErrorText(error: AccountError, t: T): string {
  if (error.code === "provider") return error.message;
  return t(`account.${error.code}`, { n: MIN_PASSWORD_LENGTH });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Returns the profile when email and password are valid and the account is active. */
export async function checkCredentials(emailRaw: string, password: string): Promise<Profile | null> {
  const email = normalizeEmail(emailRaw);
  let userId: string | null = null;

  if (backend() === "supabase") {
    const { data, error } = await supabaseAnon().auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;
    userId = data.user.id;
  } else {
    const [profile] = await db().select("profiles", { eq: { email } });
    const cred = profile && localStore.credentials.get(profile.id);
    if (!profile || !cred || !verifyPassword(password, cred.password_hash)) return null;
    userId = profile.id;
  }

  const [profile] = await db().select("profiles", { eq: { id: userId } });
  return profile && profile.active ? profile : null;
}

export async function createAccount(input: { name: string; email: string; password: string; role: Role; locale?: string }): Promise<Profile> {
  const email = normalizeEmail(input.email);
  if (input.password.length < MIN_PASSWORD_LENGTH) throw new AccountError("passwordShort");
  const existing = await db().select("profiles", { eq: { email } });
  if (existing.length) throw new AccountError("emailTaken");

  let id: string;
  if (backend() === "supabase") {
    const { data, error } = await supabaseAdmin().auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ? new AccountError("provider", error.message) : new AccountError("createFailed");
    id = data.user.id;
  } else {
    id = newId();
    localStore.credentials.set(id, hashPassword(input.password));
  }

  const profile: Profile = {
    id,
    name: input.name.trim(),
    email,
    role: input.role,
    avatar: null,
    active: true,
    locale: input.locale ?? DEFAULT_LOCALE,
    created_at: nowISO(),
  };
  await db().insert("profiles", [profile]);
  return profile;
}

export async function setPassword(userId: string, password: string): Promise<void> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new AccountError("passwordShort");
  if (backend() === "supabase") {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password });
    if (error) throw new AccountError("provider", error.message);
  } else {
    localStore.credentials.set(userId, hashPassword(password));
  }
}

export async function sendPasswordReset(emailRaw: string, redirectTo: string): Promise<boolean> {
  if (backend() !== "supabase") return false;
  await supabaseAnon().auth.resetPasswordForEmail(normalizeEmail(emailRaw), { redirectTo });
  return true;
}
