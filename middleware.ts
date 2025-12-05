import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Clears all Supabase auth cookies and redirects to login.
 * This breaks the infinite refresh-token retry loop.
 */
function clearSessionAndRedirect(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/login", request.url));

  // Delete all Supabase auth cookies to force a clean slate
  const cookiesToClear = request.cookies
    .getAll()
    .filter(
      (c) =>
        c.name.startsWith("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth")
    );

  for (const cookie of cookiesToClear) {
    response.cookies.delete(cookie.name);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestUrl = new URL(request.url);
  const isLoginPage = requestUrl.pathname.startsWith("/login");

  // Create a response we can modify
  let supabaseResponse = NextResponse.next({ request });

  // ─────────────────────────────────────────────────────────────
  // SKIP AUTH CHECK FOR LOGIN PAGE (avoid session missing errors)
  // ─────────────────────────────────────────────────────────────
  if (isLoginPage) {
    return supabaseResponse;
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE SUPABASE CLIENT (only for non-login pages)
  // ─────────────────────────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ─────────────────────────────────────────────────────────────
  // AUTH CHECK with error handling to break infinite loop
  // ─────────────────────────────────────────────────────────────
  let user = null;

  try {
    const { data, error } = await supabase.auth.getUser();

    // If there's an auth error (invalid/expired refresh token), clear session
    if (error) {
      console.warn("[Middleware] Auth error:", error.message);
      return clearSessionAndRedirect(request);
    }

    user = data.user;
  } catch (err) {
    // Unexpected error - clear session to be safe
    console.error("[Middleware] Unexpected auth error:", err);
    return clearSessionAndRedirect(request);
  }

  // ─────────────────────────────────────────────────────────────
  // ROUTE PROTECTION
  // ─────────────────────────────────────────────────────────────

  // All routes require authentication (login is already handled above)
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ─────────────────────────────────────────────────────────────
  // ROLE-BASED ACCESS CONTROL
  // ─────────────────────────────────────────────────────────────

  // Create service role client for profile lookup (bypasses RLS)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op for admin client
        },
      },
    }
  );

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Default to delivery_agent if profile doesn't exist
  const userRole = profile?.role || "delivery_agent";

  // Admin-only routes
  const adminRoutes = ["/", "/finance", "/production", "/inventory", "/orders"];
  const isAdminRoute = adminRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  if (isAdminRoute && userRole !== "super_admin") {
    return NextResponse.redirect(new URL("/delivery", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.png (favicon/logo)
     * - images: .svg, .png, .jpg, .jpeg, .gif, .webp, .ico
     * - api routes that don't need auth (add exceptions as needed)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
