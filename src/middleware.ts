import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'badu_session';

export function middleware(request: NextRequest) {
    const session = request.cookies.get(SESSION_COOKIE);
    const expectedToken = process.env.AUTH_SECRET || 'badu-default-session-token-change-in-production';

    if (!session?.value || session.value !== expectedToken) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/overview/:path*',
        '/catalog/:path*',
        '/customers/:path*',
        '/finance/:path*',
        '/seo/:path*',
    ],
};
