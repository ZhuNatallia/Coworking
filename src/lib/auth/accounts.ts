import { backend, db, newId, nowISO } from "@/lib/db";
import { localStore } from "@/lib/db/local-store";
import { supabaseAdmin, supabaseAnon } from "@/lib/db/supabase-store";
import type { Profile, Role } from "@/lib/types";
import { hashPassword, verifyPassword } from "./passwords";

export const MIN_PASSWORD_LENGTH = 8;

export class AccountError extends Error {}

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

export async function createAccount(input: { name: string; email: string; password: string; role: Role }): Promise<Profile> {
  const email = normalizeEmail(input.email);
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new AccountError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`);
  }
  const existing = await db().select("profiles", { eq: { email } });
  if (existing.length) throw new AccountError("Сотрудник с таким email уже есть");

  let id: string;
  if (backend() === "supabase") {
    const { data, error } = await supabaseAdmin().auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
    if (error || !data.user) throw new AccountError(error?.message ?? "Не удалось создать пользователя");
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
    created_at: nowISO(),
  };
  await db().insert("profiles", [profile]);
  return profile;
}

export async function setPassword(userId: string, password: string): Promise<void> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AccountError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`);
  }
  if (backend() === "supabase") {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password });
    if (error) throw new AccountError(error.message);
  } else {
    localStore.credentials.set(userId, hashPassword(password));
  }
}

export async function sendPasswordReset(emailRaw: string, redirectTo: string): Promise<boolean> {
  if (backend() !== "supabase") return false;
  await supabaseAnon().auth.resetPasswordForEmail(normalizeEmail(emailRaw), { redirectTo });
  return true;
}
