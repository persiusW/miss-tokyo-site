import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ── Security headers injected on every response ───────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data: https:",
        "media-src 'self' https://*.supabase.co blob: data:",
        "frame-src 'self' https://js.paystack.co",
        // wss:// required for Supabase Realtime subscriptions
        "connect-src 'self' https: wss://*.supabase.co",
    ].join("; "),
};

function applySecurityHeaders(response: NextResponse): NextResponse {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(key, value);
    }
    return response;
}

// ── Proxy (middleware) ────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Build a mutable response — cookie mutations must be forwarded to the browser
    let response = NextResponse.next({ request });

    // Create a Supabase SSR client that can read & refresh the session cookie.
    // getUser() validates the JWT with Supabase and refreshes tokens when needed.
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
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // ── Route protection ──────────────────────────────────────────────────────

    const isDashboard = pathname.startsWith("/overview") ||
        pathname.startsWith("/sales") ||
        pathname.startsWith("/catalog") ||
        pathname.startsWith("/customers") ||
        pathname.startsWith("/finance") ||
        pathname.startsWith("/seo") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/cms") ||
        pathname.startsWith("/communications") ||
        pathname.startsWith("/team");

    const isAccount = pathname.startsWith("/account");

    if (isDashboard || isAccount) {
        if (!user) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = "/login";
            loginUrl.searchParams.set("next", pathname);
            return applySecurityHeaders(NextResponse.redirect(loginUrl));
        }

        // Role-gating for dashboard is handled server-side within each page/layout
        // (via supabaseAdmin profiles lookup) — the edge cannot query the DB.
    }

    // Already authenticated — redirect away from login pages to home
    if ((pathname === "/login" || pathname === "/admin/login") && user) {
        const homeUrl = request.nextUrl.clone();
        homeUrl.pathname = "/";
        return applySecurityHeaders(NextResponse.redirect(homeUrl));
    }

    return applySecurityHeaders(response);
}

// ── Matcher — excludes static assets and public files ────────────────────────

export const config = {
    matcher: [
        /*
         * Match all paths EXCEPT:
         *   - _next/static  (Next.js static assets)
         *   - _next/image   (Next.js image optimisation)
         *   - favicon, sitemap, robots
         *   - public folder assets (images, fonts, video, etc.)
         */
        "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|mp4|mov)).*)",
    ],
};
