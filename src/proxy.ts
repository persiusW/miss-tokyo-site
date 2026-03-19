import { NextResponse, type NextRequest } from "next/server";

// Supabase SSR stores the session cookie as:  sb-<project-ref>-auth-token
// Checking for its presence is sufficient for the proxy guard.
// Full JWT validation (and token refresh) happens inside the dashboard layout
// via createClient().auth.getUser(), which runs on every page render.
function hasSupabaseSession(request: NextRequest): boolean {
    return request.cookies.getAll().some(
        (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token") && !!c.value
    );
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!hasSupabaseSession(request)) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Already authenticated — skip the login page
    if (pathname === "/admin/login") {
        return NextResponse.redirect(new URL("/overview", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/overview/:path*",
        "/sales/:path*",
        "/catalog/:path*",
        "/customers/:path*",
        "/finance/:path*",
        "/seo/:path*",
        "/settings/:path*",
        "/cms/:path*",
        "/communications/:path*",
        "/team/:path*",
    ],
};
