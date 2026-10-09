// Quote and create orders through the storefront's own checkout path.
import {
    createCheckoutOrder,
    quoteCheckoutOrder,
    normaliseGhanaPhone,
    type CreateCheckoutOrderInput,
} from "@/lib/checkout/createCheckoutOrder";
import { logActivity } from "@/lib/utils/logActivity";
import { err, ok, str, type ToolDef } from "./shared";
import { checkoutErrorLine } from "@/lib/errors/catalogue";

const orderInputSchema = {
    type: "object" as const,
    properties: {
        customer_name: { type: "string" },
        customer_phone: { type: "string", description: "Any Ghana format: 024..., +233..., 233..." },
        customer_email: { type: "string", description: "Only if the customer gave one." },
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    product_id: { type: "string" },
                    size: { type: "string" },
                    colour: { type: "string" },
                    brand: { type: "string" },
                    quantity: { type: "integer", minimum: 1 },
                },
                required: ["product_id", "quantity"],
            },
        },
        delivery_method: { type: "string", enum: ["delivery", "pickup"] },
        delivery_address: { type: "string", description: "Full street address and area. Required for delivery." },
        delivery_zone: {
            type: "string",
            enum: ["accra", "outside"],
            description: "accra = anywhere in Greater Accra; outside = elsewhere in Ghana. Required for delivery.",
        },
        region: { type: "string", description: "Ghana region, e.g. Greater Accra, Ashanti." },
        notes: { type: "string" },
        discount_code: { type: "string" },
    },
    required: ["customer_name", "customer_phone", "items", "delivery_method"],
};

function toOrderInput(input: any): CreateCheckoutOrderInput {
    const items = Array.isArray(input?.items) ? input.items : [];
    return {
        items: items.map((i: any) => ({
            product_id: str(i?.product_id, 40),
            size: str(i?.size, 40) || null,
            colour: str(i?.colour, 60) || null,
            brand: str(i?.brand, 60) || null,
            quantity: i?.quantity,
        })),
        customer: {
            name: str(input?.customer_name, 120),
            phone: str(input?.customer_phone, 30),
            email: str(input?.customer_email, 160) || null,
        },
        delivery: {
            method: input?.delivery_method === "pickup" ? "pickup" : "delivery",
            address: str(input?.delivery_address, 500) || null,
            zone: input?.delivery_zone === "accra" || input?.delivery_zone === "outside" ? input.delivery_zone : null,
            region: str(input?.region, 60) || null,
        },
        source: "dashboard",
        notes: str(input?.notes, 1000) || null,
        discount_code: str(input?.discount_code, 60) || null,
        hold_minutes: 15,
    };
}

export const checkoutTools: ToolDef[] = [
    {
        def: {
            name: "quote_order",
            description: "Price an order exactly as checkout would (discounts, service fee, delivery) without creating anything. Always quote before create_order and tell staff the total.",
            input_schema: orderInputSchema,
        },
        async run(input) {
            const result = await quoteCheckoutOrder(toOrderInput(input));
            if (!result.success) return err(checkoutErrorLine(result.code, result.error));
            return ok({ totals_ghs: result.totals, out_of_stock: result.outOfStock });
        },
    },
    {
        def: {
            name: "create_order",
            description: "Create the order and get a Paystack payment link for the customer. Holds the stock for 15 minutes. Only after staff have confirmed the quoted total.",
            input_schema: orderInputSchema,
        },
        async run(input, ctx) {
            const orderInput = toOrderInput(input);
            const result = await createCheckoutOrder(orderInput);
            if (!result.success) return err(checkoutErrorLine(result.code, result.error));
            await logActivity({
                userId: ctx.userId,
                userRole: ctx.role,
                actionType: "CREATE",
                resource: "order",
                resourceId: result.orderId,
                details: {
                    order_number: result.orderId.slice(0, 8),
                    via: "miss_tokyo_ai",
                    total: result.totals.total,
                    customer_phone: normaliseGhanaPhone(orderInput.customer.phone),
                },
            }).catch(() => {});
            return ok({
                order_ref: result.orderId.slice(0, 8).toUpperCase(),
                order_id: result.orderId,
                payment_link: result.authorizationUrl,
                totals_ghs: result.totals,
                stock_held_minutes: 15,
            });
        },
    },
];
