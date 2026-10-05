import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Profile } from "@/lib/types";
import { createSessionToken, readSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "./session";

export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const uid = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  const [profile] = await db().select("profiles", { eq: { id: uid } });
  return profile?.active ? profile : null;
});

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
