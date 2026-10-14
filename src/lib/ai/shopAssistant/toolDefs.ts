// The only tools the customer model is given. Order is fixed: it is part of
// the cached prompt. No server or staff-tool imports, so the isolation test can read it.
import type Anthropic from "@anthropic-ai/sdk";
import { SHOP_INFO_TOPICS } from "@/content/shopInfo";

const orderSchema = {
    type: "object" as const,
    properties: {
        customer_name: { type: "string" },
        customer_phone: { type: "string", description: "Ghana number in any format: 024…, +233…, 233…" },
        customer_email: { type: "string", description: "Only if the customer gave one." },
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    product_id: { type: "string", description: "product_id from find_products" },
                    size: { type: "string" },
                    colour: { type: "string" },
                    brand: { type: "string" },
                    quantity: { type: "integer", minimum: 1, maximum: 20 },
                },
                required: ["product_id", "quantity"],
            },
        },
        delivery_method: { type: "string", enum: ["delivery", "pickup"] },
        delivery_address: { type: "string", description: "Street address and area. Required for delivery." },
        delivery_zone: { type: "string", enum: ["accra", "outside"], description: "accra = anywhere in Greater Accra; outside = elsewhere in Ghana." },
        region: { type: "string" },
        discount_code: { type: "string" },
    },
    required: ["customer_name", "customer_phone", "items", "delivery_method"],
};

export const CUSTOMER_TOOL_DEFS: Anthropic.Tool[] = [
    {
        name: "find_products",
        description: "Find products in the shop by SKU, name or category, optionally for a size, colour or budget. Returns only pieces in stock, unless the customer named a piece (by SKU or exact name): then a sold-out piece comes back with in_stock false, whether it takes pre-orders, and similar pieces in stock.",
        input_schema: {
            type: "object",
            properties: {
                sku: { type: "string", description: "The product code, e.g. D7. Customers write it as \"SKU: D7\" on our social posts." },
                query: { type: "string", description: "Part of the product name." },
                category: { type: "string", description: "e.g. dresses, bags, shoes" },
                size: { type: "string" },
                colour: { type: "string" },
                max_price_ghs: { type: "number" },
            },
        },
    },
    {
        name: "shop_info",
        description: "The shop's own answers about delivery and fees, returns, sizing, pre-orders, payment, contact and opening hours, and the full FAQ. Use topic 'contact' when the customer wants a person: it gives them a WhatsApp button.",
        input_schema: {
            type: "object",
            properties: { topic: { type: "string", enum: [...SHOP_INFO_TOPICS] } },
            required: ["topic"],
        },
    },
    {
        name: "track_order",
        description: "Look up an order by its 8-character order number plus the email or phone used on it. A signed-in customer may set my_orders to see their last 5 orders.",
        input_schema: {
            type: "object",
            properties: {
                order_ref: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                my_orders: { type: "boolean" },
            },
        },
    },
    {
        name: "price_order",
        description: "Work out the exact total of an order (items, discounts, service fee, delivery) without placing it. Always run this and tell the customer the total before place_order.",
        input_schema: orderSchema,
    },
    {
        name: "place_order",
        description: "Place the order and give the customer a Pay now button. Only after price_order, and only after the customer clearly said yes to that total.",
        input_schema: {
            ...orderSchema,
            properties: { ...orderSchema.properties, customer_said_yes: { type: "boolean", description: "true only if the customer clearly agreed to the quoted total" } },
            required: [...orderSchema.required, "customer_said_yes"],
        },
    },
];

export const CUSTOMER_TOOL_NAMES = ["find_products", "shop_info", "track_order", "price_order", "place_order"] as const;
