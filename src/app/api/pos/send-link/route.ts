// src/app/api/pos/send-link/route.ts
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/sms';
import { validateDiscountCode, holdDiscount } from '@/lib/discountValidation';
import { normAttr } from '@/lib/utils/normAttr';
import { settlePosSession, getPosHoldMinutes } from '@/lib/posSettlement';
import { DELIVERY_DEFAULTS, parseDeliverySettings, parseZone, resolveDeliveryFee } from '@/lib/delivery';
import { POS_FALLBACK_EMAIL } from '@/lib/posContact';

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
        .select('id, price_ghs, is_sale, discount_value, track_variant_inventory')
        .in('id', productIds);

    const priceMap: Record<string, number> = {};
    for (const p of (dbProducts ?? [])) {
        const base = p.is_sale && p.discount_value > 0
            ? p.price_ghs * (1 - p.discount_value / 100)
            : p.price_ghs;
        priceMap[p.id] = base;
    }

    // Resolve size/colour to a real variant id. The till only knows the
    // product's available_sizes/available_colors and always sends
    // variantId: null, so without this every variant-tracked POS sale reserved
    // and decremented nothing — the webhook hit its "variantId missing" skip
    // and stock never moved.
    const variantTrackedIds = (dbProducts ?? [])
        .filter((p: any) => p.track_variant_inventory)
        .map((p: any) => p.id);

    const variantLookup: Record<string, string> = {};
    if (variantTrackedIds.length > 0) {
        const { data: variants } = await supabaseAdmin
            .from('product_variants')
            .select('id, product_id, size, color, brand')
            .in('product_id', variantTrackedIds);
        for (const v of (variants ?? [])) {
            variantLookup[`${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.brand)}`] = v.id;
        }
    }

    const resolveVariantId = (i: any): string | null => {
        if (i.variantId) return i.variantId;
        if (!variantTrackedIds.includes(i.productId)) return null;
        return variantLookup[`${i.productId}|${normAttr(i.size)}|${normAttr(i.color)}|${normAttr(i.brand)}`] ?? null;
    };

    // A variant-tracked product whose size/colour matches no variant row would
    // silently bypass stock control — refuse rather than oversell.
    const unresolved = items.find((i: any) => variantTrackedIds.includes(i.productId) && !resolveVariantId(i));
    if (unresolved) {
        return NextResponse.json({
            error: `"${unresolved.name}" (${[unresolved.size, unresolved.color].filter(Boolean).join(' / ') || 'no variant selected'}) does not match a stocked variant. Re-add it from the product list.`,
        }, { status: 409 });
    }

    let totalGHS = 0;
    const reservationItems = items.map((i: any) => {
        const price = priceMap[i.productId] ?? 0;
        totalGHS += price * (i.quantity ?? 1);
        return {
            product_id: i.productId,
            variant_id: resolveVariantId(i),
            quantity: i.quantity ?? 1,
        };
    });

    // Persist the verified unit prices back onto the session — the confirmation
    // receipt renders line items from session.items, so stale client prices there
    // would print a receipt that doesn't add up to what was charged.
    // The resolved variantId rides along so the webhook decrements variant stock.
    const pricedItems = items.map((i: any) => ({
        ...i,
        price: priceMap[i.productId] ?? i.price ?? 0,
        variantId: resolveVariantId(i),
    }));

    // Re-validate the staff-entered coupon / gift card against the DB. The till
    // only ever sends a code; its worth is computed here against the
    // server-calculated subtotal, exactly as /api/paystack/initialize does.
    const validatedDiscount = await validateDiscountCode(session.discount_code, totalGHS);

    if (session.discount_code && !validatedDiscount) {
        return NextResponse.json({
            error: `Code "${session.discount_code}" is no longer valid — it may have expired, been fully redeemed, or hit its usage limit. Remove it and try again.`,
        }, { status: 409 });
    }

    const discountAmount = validatedDiscount?.amount ?? 0;
    const discountedSubtotal = parseFloat(Math.max(0, totalGHS - discountAmount).toFixed(2));

    // Fetch platform fee settings — same as regular checkout
    const { data: storeFeeSettings } = await supabaseAdmin
        .from('store_settings')
        .select('platform_fee_percentage, platform_fee_label')
        .eq('id', 'default')
        .maybeSingle();

    // Fee is charged on the post-discount subtotal, matching storefront checkout
    const feePct = Number(storeFeeSettings?.platform_fee_percentage) || 0;
    const platformFeeAmount = feePct > 0
        ? parseFloat((discountedSubtotal * feePct / 100).toFixed(2))
        : 0;
    const platformFeeLabel = storeFeeSettings?.platform_fee_label || (feePct > 0 ? `${feePct}%` : undefined);

    // Own guarded select — a missing column must not take the platform-fee
    // path above down with it.
    let deliverySettings = DELIVERY_DEFAULTS;
    try {
        const { data: deliveryRow } = await supabaseAdmin
            .from('store_settings')
            .select('delivery_fees_enabled, delivery_fee_accra, delivery_fee_outside')
            .eq('id', 'default')
            .maybeSingle();
        deliverySettings = parseDeliverySettings(deliveryRow);
    } catch (err) {
        console.warn('[POS send-link] delivery settings unavailable, charging no delivery fee:', err);
    }

    const deliveryFee = resolveDeliveryFee({
        settings: deliverySettings,
        country: session.customer_country,
        deliveryMethod: session.delivery_method,
        zone: session.delivery_zone,
    });

    const amountWithFee = parseFloat((discountedSubtotal + platformFeeAmount + deliveryFee).toFixed(2));

    // Must be computed from the final chargeable amount, not from the goods
    // subtotal. A gift card covering every item still leaves a delivery fee to
    // collect, and settling here would ship that delivery for nothing.
    const fullyCovered = amountWithFee <= 0;

    const amountPesewas = Math.round(amountWithFee * 100);

    // Update total_amount with server-verified value (fee-inclusive)
    await supabaseAdmin
        .from('pos_sessions')
        .update({
            total_amount: amountWithFee,
            delivery_fee: deliveryFee,
            delivery_zone: deliveryFee > 0 ? parseZone(session.delivery_zone) : null,
            items: pricedItems,
            discount_code: validatedDiscount?.code ?? null,
            discount_amount: discountAmount,
            discount_tag: validatedDiscount?.type ?? null,
        })
        .eq('id', sessionId);

    // Staff-configurable in Settings. Resolved once and used for both the
    // reservation TTL and the customer's message, so the DB and what the
    // customer is told can never quote different windows.
    const holdMinutes = await getPosHoldMinutes();

    // Atomic inventory reservation via DB function
    const { error: reserveError } = await supabaseAdmin.rpc('fn_reserve_pos_stock', {
        p_session_id: sessionId,
        p_items: reservationItems,
        p_ttl_mins: holdMinutes,
    });

    if (reserveError) {
        const msg = reserveError.message.includes('Insufficient stock')
            ? 'One or more items are out of stock'
            : reserveError.message;
        return NextResponse.json({ error: msg }, { status: 409 });
    }

    // Hold the discount for the same window as the stock, so a second till
    // cannot be quoted value this basket is already relying on.
    if (validatedDiscount) {
        const held = await holdDiscount(validatedDiscount, { posSessionId: sessionId }, holdMinutes);
        if (!held) {
            // Release the stock we just took — this sale is not going ahead
            await supabaseAdmin.from('pos_reservations').delete().eq('pos_session_id', sessionId);
            await supabaseAdmin.from('pos_sessions').update({ status: 'draft' }).eq('id', sessionId);
            return NextResponse.json({
                error: `"${validatedDiscount.code}" was just used on another sale and no longer covers this one. Remove it and try again.`,
            }, { status: 409 });
        }
    }

    const baseUrlForCompleted = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://misstokyo.shop';

    // Gift card covers the whole basket — there is nothing to charge, so skip
    // Paystack entirely and settle the sale here. Stock is already held by the
    // reservation above, and settlePosSession is the same path a paid link takes:
    // it creates the order, decrements stock, debits the card and sends the receipt.
    if (fullyCovered) {
        const result = await settlePosSession(sessionId, { logPrefix: '[POS gift-card]' });

        if (!result.settled) {
            return NextResponse.json({ error: 'This sale has already been completed.' }, { status: 409 });
        }
        if (!result.orderId) {
            return NextResponse.json({ error: 'Could not create the order. Nothing was charged — try again.' }, { status: 500 });
        }

        return NextResponse.json({
            paymentUrl: `${baseUrlForCompleted}/pay/${sessionId}`,
            sessionId,
            total: 0,
            completed: true,
            orderRef: result.orderRef,
            discount: validatedDiscount
                ? { code: validatedDiscount.code, amount: discountAmount, label: validatedDiscount.label }
                : null,
            // No `delivery` block: settlePosSession fires the confirmation email
            // and SMS but does not report per channel, so claiming either was
            // delivered would be a guess. Failures are logged there.
        });
    }

    // Paystack Payment Request — same API as invoice feature
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: 'Paystack not configured' }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://misstokyo.shop';

    // Apply split group when configured and amount is above Paystack's minimum (GHS 5)
    const paystackSplitCode = process.env.PAYSTACK_SPLIT_CODE;
    const splitPayload = (paystackSplitCode && amountWithFee >= 5) ? { split_code: paystackSplitCode } : {};

    const paystackBody = {
        // Paystack rejects an initialize call with no email, so a walk-in who
        // gave none is initialised against the store's own mailbox. The session
        // row keeps its null — this substitution never leaves this payload.
        email: session.customer_email || POS_FALLBACK_EMAIL,
        amount: amountPesewas,
        currency: 'GHS',
        channels: ['mobile_money', 'card', 'bank', 'bank_transfer', 'ussd'],
        ...splitPayload,
        metadata: {
            pos_session_id: sessionId,
            source: 'pos',
            ...(platformFeeAmount > 0 ? { platform_fee_amount: platformFeeAmount, platform_fee_label: platformFeeLabel } : {}),
            ...(validatedDiscount ? {
                discount_code: validatedDiscount.code,
                discount_amount: discountAmount,
                discount_tag: validatedDiscount.type,
            } : {}),
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

    // The link must reach the customer on BOTH channels. sendSMS resolves with
    // { ok: false } on an mNotify failure rather than throwing, so the result has
    // to be inspected — a bare .catch() reports success for undelivered texts.
    const [emailSettled, smsSettled] = await Promise.allSettled([
        // Email — skipped for a walk-in with no address; SMS carries the link
        session.customer_email
            ? getResend().emails.send({
                from: 'Miss Tokyo <info@info.misstokyo.shop>',
                to: session.customer_email,
                subject: 'Your Miss Tokyo payment link',
                html: `
                    <p>Hi ${firstName},</p>
                    <p>Your Miss Tokyo order is ready. Review your items and complete payment below.</p>
                    <p><strong>Items:</strong> ${itemList}</p>
                    ${validatedDiscount ? `<p><strong>Discount (${validatedDiscount.code}):</strong> -GH&#8373;${discountAmount.toFixed(2)}</p>` : ''}
                    <p><strong>Total:</strong> GH&#8373;${amountWithFee.toFixed(2)}</p>
                    <p><a href="${previewUrl}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;">Review &amp; Pay &mdash; GH&#8373;${amountWithFee.toFixed(2)}</a></p>
                    <p style="color:#999;font-size:12px;">This link expires in ${holdMinutes} minutes.</p>
                `,
            })
            : Promise.resolve(null),

        // SMS
        session.customer_phone
            ? sendSMS({
                to: session.customer_phone,
                message: `Hi ${firstName}, your Miss Tokyo order (GH${String.fromCharCode(8373)}${amountWithFee.toFixed(2)}) is ready. Review and pay here: ${previewUrl} (expires in ${holdMinutes} mins)`,
            })
            : Promise.resolve(null),
    ]);

    let emailStatus: 'sent' | 'failed' | 'no_email' = 'no_email';
    let emailError: string | null = null;
    if (session.customer_email) {
        if (emailSettled.status === 'fulfilled') {
            const resendError = (emailSettled.value as { error?: { message?: string } } | undefined)?.error;
            emailStatus = resendError ? 'failed' : 'sent';
            emailError = resendError?.message ?? null;
        } else {
            emailStatus = 'failed';
            emailError = String((emailSettled.reason as Error)?.message ?? emailSettled.reason);
        }
    }
    if (emailError) console.error('[pos/send-link] email error:', emailError);

    let smsStatus: 'sent' | 'failed' | 'no_phone' = 'no_phone';
    let smsError: string | null = null;
    if (session.customer_phone) {
        if (smsSettled.status === 'fulfilled') {
            const result = smsSettled.value as { ok: boolean; error?: string } | null;
            smsStatus = result?.ok ? 'sent' : 'failed';
            smsError = result?.ok ? null : (result?.error ?? 'Unknown SMS error');
        } else {
            smsStatus = 'failed';
            smsError = String((smsSettled.reason as Error)?.message ?? smsSettled.reason);
        }
    }
    if (smsError) console.error('[pos/send-link] sms error:', smsError);

    // Return the preview URL — staff copies/shares this, not the raw Paystack URL
    return NextResponse.json({
        paymentUrl: previewUrl,
        sessionId,
        total: amountWithFee,
        discount: validatedDiscount ? { code: validatedDiscount.code, amount: discountAmount, label: validatedDiscount.label } : null,
        // Per-channel outcome so the till can tell staff what actually reached
        // the customer instead of always claiming both were delivered
        delivery: { email: emailStatus, emailError, sms: smsStatus, smsError },
    });
}
