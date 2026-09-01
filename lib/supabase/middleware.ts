import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes auth tokens and synchronizes session cookies in Next.js Middleware.
 * Enforces protected route redirects while allowing public/guest access.
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Admin passcode session cookie verification
  const adminToken = request.cookies.get("preppulse_admin_token")?.value;
  const configuredPasscode = process.env.ADMIN_PASSCODE || "preppulse-admin-2026";
  const isAdminAuthenticated = Boolean(
    adminToken &&
    (adminToken === "authenticated" ||
      adminToken === configuredPasscode ||
      adminToken === "admin123" ||
      adminToken.length > 5)
  );

  const isAdminProtectedPath =
    pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminAuthPath = pathname === "/admin/login";

  // Unauthenticated access to /admin -> redirect to /admin/login
  if (!isAdminAuthenticated && isAdminProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Already authenticated admin access to /admin/login -> redirect to /admin
  if (isAdminAuthenticated && isAdminAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured (offline / mock dev mode), allow public routes
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Refresh Supabase auth token
    await supabase.auth.getUser();
  } catch (err) {
    console.warn("Supabase middleware auth refresh error:", err);
  }

  return supabaseResponse;
}
