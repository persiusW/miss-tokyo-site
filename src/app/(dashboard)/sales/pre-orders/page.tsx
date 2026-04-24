import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { OrdersClient } from "../orders/OrdersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PreOrdersPage() {
    const { data: orders } = await supabase
        .from("orders")
        .select("id, customer_name, customer_email, customer_phone, total_amount, status, paystack_reference, shipping_address, delivery_method, created_at, has_preorder")
        .eq("has_preorder", true)
        .order("created_at", { ascending: false })
        .limit(500);

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Pre-Orders</h1>
                <p className="text-neutral-500">Orders containing at least one pre-order item. Fulfil regular items via the main Orders page; return here when the pre-order stock arrives.</p>
            </header>
            <OrdersClient orders={orders ?? []} />
        </div>
    );
}
