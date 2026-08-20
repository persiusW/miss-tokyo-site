// src/app/api/pos/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PosItem, PosDeliveryMethod } from '@/types/pos';
import { POS_FALLBACK_EMAIL, isNotNullViolation, normaliseEmail } from '@/lib/posContact';

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
        customer_country,
        customer_region,
        contact_id,
        delivery_method,
        delivery_zone,
        discount_code,
        items,
        notes,
    }: {
        sessionId?: string;
        customer_name: string;
        customer_email?: string | null;
        customer_phone?: string;
        customer_address?: string;
        customer_country?: string;
        customer_region?: string;
        contact_id?: string;
        delivery_method?: PosDeliveryMethod;
        delivery_zone?: string | null;
        discount_code?: string | null;
        items: PosItem[];
        notes?: string;
    } = await req.json();

    if (!customer_name) {
        return NextResponse.json({ error: 'customer_name is required' }, { status: 400 });
    }

    // Walk-ins frequently have no email. The payment link still has to reach
    // them somehow, so one contact channel is required — not specifically email.
    const email = normaliseEmail(customer_email);
    const phone = customer_phone?.trim() || null;
    if (!email && !phone) {
        return NextResponse.json({
            error: 'A phone number or an email address is required — the payment link needs somewhere to go',
        }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    // Default to pickup for backward compat with any caller that omits the field
    const fulfilment: PosDeliveryMethod = delivery_method === 'delivery' ? 'delivery' : 'pickup';

    if (fulfilment === 'delivery' && !customer_address?.trim()) {
        return NextResponse.json({ error: 'A delivery address is required for delivery orders' }, { status: 400 });
    }

    const payload = {
        created_by: user.id,
        customer_name,
        customer_email: email,
        customer_phone: phone,
        customer_address: customer_address ?? null,
        // Only meaningful for delivery — mirrors the storefront address fields
        customer_country: fulfilment === 'delivery' ? (customer_country || null) : null,
        customer_region: fulfilment === 'delivery' ? (customer_region || null) : null,
        contact_id: contact_id ?? null,
        delivery_method: fulfilment,
        // Only the zone is stored. Its price is resolved server-side in
        // send-link, exactly as the discount code is.
        delivery_zone: fulfilment === 'delivery' ? (delivery_zone || null) : null,
        items,
        // Only the code is stored here. Its value is resolved server-side in
        // send-link — a client-supplied discount amount is never trusted.
        discount_code: discount_code?.trim().toUpperCase() || null,
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

        // Until the DROP NOT NULL migration is applied, a null email is rejected
        // outright. Storing the store's own address beats refusing the sale.
        if (isNotNullViolation(error, 'customer_email')) {
            console.warn('[pos/session] customer_email is still NOT NULL — storing the fallback address. Apply 20260820000000_pos_optional_customer_email.sql.');
            const { error: retryError } = await supabaseAdmin
                .from('pos_sessions')
                .update({ ...payload, customer_email: POS_FALLBACK_EMAIL })
                .eq('id', sessionId);
            if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
            return NextResponse.json({ sessionId });
        }

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ sessionId });
    }

    // Create new draft
    let { data, error } = await supabaseAdmin
        .from('pos_sessions')
        .insert(payload)
        .select('id')
        .single();

    if (isNotNullViolation(error, 'customer_email')) {
        console.warn('[pos/session] customer_email is still NOT NULL — storing the fallback address. Apply 20260820000000_pos_optional_customer_email.sql.');
        ({ data, error } = await supabaseAdmin
            .from('pos_sessions')
            .insert({ ...payload, customer_email: POS_FALLBACK_EMAIL })
            .select('id')
            .single());
    }

    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
    return NextResponse.json({ sessionId: data.id });
}
