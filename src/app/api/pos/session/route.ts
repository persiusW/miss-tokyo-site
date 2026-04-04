// src/app/api/pos/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PosItem } from '@/types/pos';

export async function POST(req: NextRequest) {
    // Auth check
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'owner', 'sales_staff'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
        sessionId,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        contact_id,
        items,
        notes,
    }: {
        sessionId?: string;
        customer_name: string;
        customer_email: string;
        customer_phone?: string;
        customer_address?: string;
        contact_id?: string;
        items: PosItem[];
        notes?: string;
    } = await req.json();

    if (!customer_name || !customer_email) {
        return NextResponse.json({ error: 'customer_name and customer_email are required' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    const payload = {
        created_by: user.id,
        customer_name,
        customer_email,
        customer_phone: customer_phone ?? null,
        customer_address: customer_address ?? null,
        contact_id: contact_id ?? null,
        items,
        notes: notes ?? null,
        status: 'draft' as const,
        // total_amount computed server-side on send-link; use client sum as placeholder for draft
        total_amount: items.reduce((s, i) => s + i.price * i.quantity, 0) || 0.01,
    };

    if (sessionId) {
        // Update existing draft — verify ownership
        const { data: existing } = await supabaseAdmin
            .from('pos_sessions')
            .select('id, created_by, status')
            .eq('id', sessionId)
            .single();

        if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        if (existing.created_by !== user.id && !['admin','owner'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (existing.status !== 'draft') {
            return NextResponse.json({ error: 'Can only edit draft sessions' }, { status: 409 });
        }

        const { error } = await supabaseAdmin
            .from('pos_sessions')
            .update(payload)
            .eq('id', sessionId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ sessionId });
    }

    // Create new draft
    const { data, error } = await supabaseAdmin
        .from('pos_sessions')
        .insert(payload)
        .select('id')
        .single();

    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    return NextResponse.json({ sessionId: data.id });
}
