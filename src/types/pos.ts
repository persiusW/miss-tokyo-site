// src/types/pos.ts

export type PosStatus = 'draft' | 'pending_payment' | 'paid' | 'expired' | 'cancelled';

export type PosDeliveryMethod = 'pickup' | 'delivery';

export type PosDiscountTag = 'coupon' | 'gift_card';

// Preview shape returned by POST /api/checkout/validate-code — the till shows
// this, but the charged amount is always recomputed in /api/pos/send-link.
export interface PosAppliedDiscount {
    code: string;
    type: PosDiscountTag;
    discount_type: string;
    discount_amount: number;
    label: string;
}

export interface PosItem {
    productId: string;
    variantId: string | null;
    name: string;
    size: string | null;
    color: string | null;
    price: number;        // GHS, server-verified on send
    quantity: number;
}

export interface PosSession {
    id: string;
    created_by: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    customer_address: string | null;
    customer_country: string | null;
    customer_region: string | null;
    contact_id: string | null;
    delivery_method: PosDeliveryMethod;
    delivery_fee?: number;
    delivery_zone?: string | null;
    items: PosItem[];
    // Server-verified at send-link time; never accepted from the till client
    discount_code: string | null;
    discount_amount: number;
    discount_tag: PosDiscountTag | null;
    total_amount: number;
    status: PosStatus;
    paystack_reference: string | null;
    expires_at: string | null;
    notes: string | null;
    created_at: string;
    paid_at: string | null;
    order_id: string | null;
}

// Public shape returned by GET /api/pos/session/[id] — no PII
export interface PosSessionPublic {
    id: string;
    status: PosStatus;
    expires_at: string | null;
    total_amount: number;
    delivery_fee: number;
    delivery_zone: string | null;
    discount_code: string | null;
    discount_amount: number;
    items: Array<{
        name: string;
        sku: string | null;
        size: string | null;
        color: string | null;
        quantity: number;
        price: number;
        image_url: string | null;
    }>;
    paymentUrl: string | null;
}

// Shape for product in POS browser
export interface PosProduct {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    price_ghs: number;
    image_urls: string[] | null;
    inventory_count: number;
    track_inventory: boolean;
    track_variant_inventory: boolean;
    available_sizes: string[] | null;
    available_colors: string[] | null;
}
