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
        description: "Find products in the shop by SKU, words from the name or kind of piece, or category, optionally for a size, colour or budget (a budget alone browses the newest pieces under it). Returns only pieces in stock, unless the customer named a piece (by SKU or exact name): then a sold-out piece comes back with in_stock false, whether it takes pre-orders, and similar pieces in stock. When nothing matches it lists the kinds of piece the shop sells.",
        input_schema: {
            type: "object",
            properties: {
                sku: { type: "string", description: "The product code, e.g. D7. Customers write it as \"SKU: D7\" on our social posts." },
                query: { type: "string", description: "A few words: part of the name or the kind of piece, e.g. \"bodycon\", \"heels\", \"perfume\", \"maxi skirt\". Not occasions: turn \"a night out\" into kinds of piece." },
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

/**
 * WhatsApp only, behind whatsapp_choices_enabled: a question the customer
 * answers by tapping. Added after the customer tools, so their cached prefix
 * is unchanged.
 */
export const OFFER_CHOICES_TOOL: Anthropic.Tool = {
    name: "offer_choices",
    description: "Ask the customer a question with tappable options instead of asking them to type: which size or colour, which piece, delivery or pickup, yes or no. 2 to 10 short options, up to 24 characters each (3 or fewer short ones become buttons, more become a list). This sends your question, so call it on its own, after any other tools, and say nothing else this turn. Their tap comes back as \"[tapped: option]\".",
    input_schema: {
        type: "object",
        properties: {
            question: { type: "string", description: "The question, one or two short lines." },
            options: { type: "array", items: { type: "string" }, description: "The choices, each up to 24 characters." },
        },
        required: ["question", "options"],
    },
};

/** WhatsApp only, behind whatsapp_restock_alerts_enabled: tell the customer when a sold-out piece is back. */
export const NOTIFY_WHEN_BACK_TOOL: Anthropic.Tool = {
    name: "notify_when_back",
    description: "Save a back-in-stock alert: we message the customer here on WhatsApp when a sold-out piece is back in stock. Only for a piece find_products returned with in_stock false, and only when the customer wants to wait for it (not a similar piece or a pre-order). Give the size and colour they want if they said.",
    input_schema: {
        type: "object",
        properties: {
            product_id: { type: "string", description: "product_id from find_products" },
            size: { type: "string" },
            colour: { type: "string" },
        },
        required: ["product_id"],
    },
};

/** WhatsApp only, behind whatsapp_returns_enabled: a return or exchange, handed to the team. */
export const START_RETURN_TOOL: Anthropic.Tool = {
    name: "start_return",
    description: "Save a return or exchange request and pass the chat to our team, who arrange it. Only after you read the policy (shop_info topic returns), looked the order up with track_order, and asked what is wrong and whether they'd like an exchange or store credit. Ask for a photo first if the piece is faulty or the wrong item.",
    input_schema: {
        type: "object",
        properties: {
            order_ref: { type: "string", description: "The 8-character order number." },
            reason: { type: "string", enum: ["wrong_size", "faulty", "not_as_described", "wrong_item", "changed_mind", "other"] },
            wants: { type: "string", enum: ["exchange", "store_credit", "unsure"] },
            details: { type: "string", description: "What the customer said, briefly." },
        },
        required: ["order_ref", "reason"],
    },
};

/** Tools that end the turn: they send the message themselves, so the model says nothing after them. */
export const END_TURN_TOOL_NAMES = ["offer_choices"] as const;
/** Tools a turn gets only when its channel and settings allow. */
export const OPTIONAL_TOOL_NAMES = ["offer_choices", "notify_when_back", "start_return"] as const;

