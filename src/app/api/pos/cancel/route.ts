// src/app/api/pos/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'owner', 'sales_staff'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const { data: session } = await supabaseAdmin
        .from('pos_sessions').select('id, created_by, status').eq('id', sessionId).single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Ownership: sales_staff can only cancel their own sessions
    const isAdmin = ['admin', 'owner'].includes(profile.role);
    if (!isAdmin && session.created_by !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Block cancellation of paid sessions
    if (session.status === 'paid') {
        return NextResponse.json({ error: 'Cannot cancel a paid session' }, { status: 409 });
    }

    if (['cancelled', 'expired'].includes(session.status)) {
        return NextResponse.json({ error: 'Session already closed' }, { status: 409 });
    }

    // Explicit reservation delete (FK cascade only fires on row delete, not status update)
    await supabaseAdmin.from('pos_reservations').delete().eq('pos_session_id', sessionId);
    await supabaseAdmin.from('pos_sessions').update({ status: 'cancelled' }).eq('id', sessionId);

    return NextResponse.json({ ok: true });
}
