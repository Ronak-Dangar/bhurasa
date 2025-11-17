import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create client with anon key for auth check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
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
    }
  );

  // Create service role client for profile lookup (bypasses RLS)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
        },
      },
    }
  );

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow access to login page without authentication
  if (request.nextUrl.pathname === "/login") {
    // If user is already logged in, redirect to home
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // Protect all other routes - require authentication
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fetch user role from profiles table using service role to bypass RLS
const { data: profile, error, status } = await supabaseAdmin
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

console.log("profile", profile, "error", error, "status", status);

  // Default to delivery_agent if profile doesn't exist or has no role
  // In production, you should create profiles for all users manually
  const userRole = profile?.role || "delivery_agent";

  // Role-based access control
  const path = request.nextUrl.pathname;

  // Admin-only routes: /, /finance, /production, /inventory, /orders
  const adminRoutes = ["/", "/finance", "/production", "/inventory", "/orders"];
  const isAdminRoute = adminRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  if (isAdminRoute && userRole !== "super_admin") {
    // Redirect delivery agents to their dashboard
    return NextResponse.redirect(new URL("/delivery", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
