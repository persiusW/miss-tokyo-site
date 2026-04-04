import { NextResponse } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'persiuswilder@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Killdecat1';
const AUTH_SECRET = process.env.AUTH_SECRET || 'badu-default-session-token-change-in-production';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });
        response.cookies.set('badu_session', AUTH_SECRET, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
