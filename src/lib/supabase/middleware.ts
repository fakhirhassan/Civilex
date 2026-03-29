import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public paths that don't need auth
  const publicPaths = ["/login", "/register", "/forgot-password", "/verify-otp"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isApiPath = pathname.startsWith("/api");

  // If not authenticated and trying to access protected route
  if (!user && !isPublicPath && !isApiPath && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If authenticated and trying to access auth pages
  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Role-based route protection for authenticated users
  // Read role from user_metadata (set during signup) to avoid a DB query per request
  if (user && !isPublicPath && !isApiPath) {
    const role = user.user_metadata?.role as string | undefined;

    if (role) {
      // Define restricted routes that only specific roles can access
      const restrictedRoutes: Record<string, string[]> = {
        "/cases/new": ["client"],
        "/cases/scrutiny": ["admin_court", "magistrate"],
        "/cases/criminal": ["admin_court", "magistrate"],
        "/lawyers": ["client"],
        "/ai-assistant": ["lawyer"],
      };

      for (const [route, allowedRoles] of Object.entries(restrictedRoutes)) {
        if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
