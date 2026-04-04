// src/app/api/pos/expire/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
    // Static token auth — must match POS_EXPIRE_TOKEN env var
    const token = process.env.POS_EXPIRE_TOKEN;
    if (!token) {
        console.error('[pos/expire] POS_EXPIRE_TOKEN not set');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    const incoming = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (incoming !== token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all pending_payment sessions past their expiry
    const { data: expiredSessions } = await supabaseAdmin
        .from('pos_sessions')
        .select('id')
        .eq('status', 'pending_payment')
        .lt('expires_at', new Date().toISOString());

    if (!expiredSessions || expiredSessions.length === 0) {
        return NextResponse.json({ expired: 0 });
    }

    const ids = expiredSessions.map(s => s.id);

    // Delete reservations first, then update status
    await supabaseAdmin.from('pos_reservations').delete().in('pos_session_id', ids);
    await supabaseAdmin.from('pos_sessions')
        .update({ status: 'expired' })
        .in('id', ids);

    console.log(`[pos/expire] Expired ${ids.length} sessions`);
    return NextResponse.json({ expired: ids.length });
}
