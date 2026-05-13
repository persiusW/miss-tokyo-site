// Test-only page: renders OrdersClient with hardcoded fixture data so Playwright
// can assert badge/dot rendering logic without needing to inject SSR data.
// Protected by dashboard auth (same route group). Never appears in nav.
import { notFound } from "next/navigation";
import { OrdersClient } from "../sales/orders/OrdersClient";

const NOW = new Date().toISOString();

const FIXTURES = [
    {
        id: "aaaaaaaa-0000-0000-0000-000000000001",
        customer_name: "Regular Customer",
        customer_email: "regular@example.com",
        customer_phone: "0200000001",
        total_amount: 100,
        paystack_reference: "ref_regular",
        shipping_address: { text: "1 Test St" },
        delivery_method: "delivery",
        created_at: NOW,
        payment_status: "paid",
        status: "paid",
        has_preorder: false,
        is_mixed_order: false,
        customer_metadata: null,
    },
    {
        id: "bbbbbbbb-0000-0000-0000-000000000002",
        customer_name: "Pure Preorder Customer",
        customer_email: "preorder@example.com",
        customer_phone: "0200000002",
        total_amount: 200,
        paystack_reference: "ref_preorder",
        shipping_address: { text: "2 Test St" },
        delivery_method: "delivery",
        created_at: NOW,
        payment_status: "paid",
        status: "paid",
        has_preorder: true,
        is_mixed_order: false,
        customer_metadata: null,
    },
    {
        id: "cccccccc-0000-0000-0000-000000000003",
        customer_name: "Mixed Undispatched",
        customer_email: "mixed@example.com",
        customer_phone: "0200000003",
        total_amount: 300,
        paystack_reference: "ref_mixed",
        shipping_address: { text: "3 Test St" },
        delivery_method: "delivery",
        created_at: NOW,
        payment_status: "paid",
        status: "paid",
        has_preorder: true,
        is_mixed_order: true,
        customer_metadata: null,
    },
    {
        id: "dddddddd-0000-0000-0000-000000000004",
        customer_name: "Mixed Partial",
        customer_email: "partial@example.com",
        customer_phone: "0200000004",
        total_amount: 400,
        paystack_reference: "ref_partial",
        shipping_address: { text: "4 Test St" },
        delivery_method: "delivery",
        created_at: NOW,
        payment_status: "paid",
        status: "shipped",
        has_preorder: true,
        is_mixed_order: true,
        customer_metadata: { regular_items_dispatched_at: NOW },
    },
    {
        id: "eeeeeeee-0000-0000-0000-000000000005",
        customer_name: "Mixed Fulfilled",
        customer_email: "fulfilled@example.com",
        customer_phone: "0200000005",
        total_amount: 500,
        paystack_reference: "ref_fulfilled",
        shipping_address: { text: "5 Test St" },
        delivery_method: "delivery",
        created_at: NOW,
        payment_status: "paid",
        status: "fulfilled",
        has_preorder: true,
        is_mixed_order: true,
        customer_metadata: { regular_items_dispatched_at: NOW },
    },
];

export default function TestOrdersPage() {
    if (process.env.NODE_ENV === "production") notFound();
    return (
        <div className="space-y-6">
            <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">
                Test Orders Fixture
            </h1>
            <OrdersClient orders={FIXTURES as any} />
        </div>
    );
}
