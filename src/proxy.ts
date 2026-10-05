import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

/** Optimistic redirect for signed-out visitors; pages and actions still verify the session. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|icons|icon|apple-icon|manifest.webmanifest|sw.js|offline.html|favicon.ico).*)",
  ],
};
