// src/app/api/pos/session/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { PosSessionPublic } from '@/types/pos';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
        .from('pos_sessions')
        .select('id, status, expires_at, total_amount, items, paystack_reference')
        .eq('id', id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rawItems: any[] = Array.isArray(data.items) ? data.items : [];

    // Batch-fetch product image + SKU so the customer preview page has full details
    const productIds = [...new Set(rawItems.map((i: any) => i.productId).filter(Boolean))];
    let productMap: Record<string, { image_url: string | null; sku: string | null }> = {};
    if (productIds.length > 0) {
        const { data: products } = await supabaseAdmin
            .from('products')
            .select('id, image_urls, sku')
            .in('id', productIds);
        for (const p of (products ?? [])) {
            productMap[p.id] = { image_url: p.image_urls?.[0] ?? null, sku: p.sku ?? null };
        }
    }

    const items = rawItems.map((i: any) => ({
        name: i.name ?? '',
        sku: productMap[i.productId]?.sku ?? null,
        size: i.size ?? null,
        color: i.color ?? null,
        quantity: i.quantity ?? 1,
        price: i.price ?? 0,
        image_url: productMap[i.productId]?.image_url ?? null,
    }));

    // paystack_reference now stores the Paystack authorization_url directly
    const paymentUrl = data.paystack_reference ?? null;

    const payload: PosSessionPublic = {
        id: data.id,
        status: data.status,
        expires_at: data.expires_at,
        total_amount: data.total_amount,
        items,
        paymentUrl,
    };

    return NextResponse.json(payload);
}
