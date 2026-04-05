// src/app/api/pos/send-link/route.ts
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/sms';

function getResend() { return new Resend(process.env.RESEND_API_KEY); }

export async function POST(req: NextRequest) {
    // Auth
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

    // Fetch session
    const { data: session } = await supabaseAdmin
        .from('pos_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (!['draft', 'pending_payment'].includes(session.status)) {
        return NextResponse.json({ error: 'Session cannot be sent in current state' }, { status: 409 });
    }

    const items: any[] = Array.isArray(session.items) ? session.items : [];
    if (items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });

    // Server-side price recalculation — never trust stored item prices
    const productIds = [...new Set(items.map((i: any) => i.productId))];
    const { data: dbProducts } = await supabaseAdmin
        .from('products')
        .select('id, price_ghs, is_sale, discount_value')
        .in('id', productIds);

    const priceMap: Record<string, number> = {};
    for (const p of (dbProducts ?? [])) {
        const base = p.is_sale && p.discount_value > 0
            ? p.price_ghs * (1 - p.discount_value / 100)
            : p.price_ghs;
        priceMap[p.id] = base;
    }

    let totalGHS = 0;
    const reservationItems = items.map((i: any) => {
        const price = priceMap[i.productId] ?? 0;
        totalGHS += price * (i.quantity ?? 1);
        return {
            product_id: i.productId,
            variant_id: i.variantId ?? null,
            quantity: i.quantity ?? 1,
        };
    });

    const amountPesewas = Math.round(totalGHS * 100);

    // Update total_amount with server-verified value
    await supabaseAdmin
        .from('pos_sessions')
        .update({ total_amount: totalGHS })
        .eq('id', sessionId);

    // Atomic inventory reservation via DB function
    const { error: reserveError } = await supabaseAdmin.rpc('fn_reserve_pos_stock', {
        p_session_id: sessionId,
        p_items: reservationItems,
    });

    if (reserveError) {
        const msg = reserveError.message.includes('Insufficient stock')
            ? 'One or more items are out of stock'
            : reserveError.message;
        return NextResponse.json({ error: msg }, { status: 409 });
    }

    // Paystack Payment Request — same API as invoice feature
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://misstokyo.shop';
    // Use transaction/initialize — takes email directly, no customer pre-creation needed
    const paystackBody = {
        email: session.customer_email,
        amount: amountPesewas,
        currency: 'GHS',
        channels: ['mobile_money', 'card', 'bank', 'bank_transfer', 'ussd'],
        metadata: {
            pos_session_id: sessionId,
            source: 'pos',
        },
    };

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(paystackBody),
    });
    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
        // Rollback: release reservations
        await supabaseAdmin.from('pos_reservations').delete().eq('pos_session_id', sessionId);
        await supabaseAdmin.from('pos_sessions').update({ status: 'draft' }).eq('id', sessionId);
        return NextResponse.json({ error: paystackData.message ?? 'Paystack error' }, { status: 500 });
    }

    // Store the authorization_url as paystack_reference — used by /pay/[pos_id] as the "Pay Now" href
    const authorizationUrl: string = paystackData.data?.authorization_url ?? '';

    await supabaseAdmin
        .from('pos_sessions')
        .update({ paystack_reference: authorizationUrl })
        .eq('id', sessionId);

    // Customers receive the branded preview page URL — they see items before hitting Paystack
    const previewUrl = `${baseUrl}/pay/${sessionId}`;

    // Send email + SMS in parallel (non-blocking — log failures, don't fail the request)
    const firstName = session.customer_name.split(' ')[0];
    const itemList = items.map((i: any) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join(', ');

    await Promise.allSettled([
        // Email
        getResend().emails.send({
            from: 'Miss Tokyo <info@info.misstokyo.shop>',
            to: session.customer_email,
            subject: 'Your Miss Tokyo payment link',
            html: `
                <p>Hi ${firstName},</p>
                <p>Your Miss Tokyo order is ready. Review your items and complete payment below.</p>
                <p><strong>Items:</strong> ${itemList}</p>
                <p><strong>Total:</strong> GH&#8373;${totalGHS.toFixed(2)}</p>
                <p><a href="${previewUrl}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;">Review &amp; Pay &mdash; GH&#8373;${totalGHS.toFixed(2)}</a></p>
                <p style="color:#999;font-size:12px;">This link expires in 30 minutes.</p>
            `,
        }).catch((e: unknown) => console.error('[pos/send-link] email error:', e)),

        // SMS
        session.customer_phone
            ? sendSMS({
                to: session.customer_phone,
                message: `Hi ${firstName}, your Miss Tokyo order (GH${String.fromCharCode(8373)}${totalGHS.toFixed(2)}) is ready. Review and pay here: ${previewUrl} (expires in 30 mins)`,
            }).catch((e: unknown) => console.error('[pos/send-link] sms error:', e))
            : Promise.resolve(),
    ]);

    // Return the preview URL — staff copies/shares this, not the raw Paystack URL
    return NextResponse.json({ paymentUrl: previewUrl, sessionId, total: totalGHS });
}
