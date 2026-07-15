import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that must stay reachable without being logged in.
// Everything else (/, /priorities, future pages) is protected.
const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
  "/api/auth", // NextAuth's own internal routes (callback, signin, session, etc.)
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let static assets and public paths through untouched.
  if (
    isPublicPath(pathname) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Fallback: simple shared-password session cookie (set by /api/login).
  const simpleSession = request.cookies.get("app_session")?.value;
  if (simpleSession === "valid") {
    return NextResponse.next();
  }

  // Primary: Google Workspace login via NextAuth.
  if (!process.env.NEXTAUTH_SECRET) {
    // Fail-open with a loud warning rather than lock everyone out by mistake
    // if the app was deployed before env vars were configured.
    console.warn(
      "[auth] NEXTAUTH_SECRET is not set — the app is NOT protected. Configure env vars in Vercel."
    );
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  // Not authenticated by either method — send to the login page,
  // remembering where they were trying to go.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
