import { cookies } from "next/headers";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current";
import { DEFAULT_THEME, isTheme, THEME_COOKIE, type Theme } from "./theme";

/** The signed-in user's theme, then the browser cookie, otherwise light. */
export const getTheme = cache(async (): Promise<Theme> => {
  const user = await getCurrentUser();
  if (isTheme(user?.theme)) return user.theme;
  const cookie = (await cookies()).get(THEME_COOKIE)?.value;
  if (isTheme(cookie)) return cookie;
  return DEFAULT_THEME;
});
