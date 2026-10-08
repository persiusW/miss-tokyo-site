// Model and price constants for every AI feature. Internal figures: never shown
// to customers or staff.

export const AI_MODEL = "claude-sonnet-5-5";

/**
 * USD per million tokens for claude-sonnet-5-5. Verify against Anthropic's
 * price list before changing the model.
 */
export const PRICE_USD_PER_MTOK = {
    input: 2,
    output: 10,
    cacheRead: 0.2,
    cacheWrite: 2.5, // 5-minute cache writes
} as const;

/** Fixed conversion for the GHS spend cap. */
export const USD_TO_GHS = 15.5;

export type TokenUsage = {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
};

/** Cost of one model call. input_tokens excludes cached tokens, which are priced separately. */
export function costUsd(u: TokenUsage): number {
    const m = 1_000_000;
    return (
        (u.input_tokens * PRICE_USD_PER_MTOK.input) / m +
        (u.output_tokens * PRICE_USD_PER_MTOK.output) / m +
        ((u.cache_read_input_tokens ?? 0) * PRICE_USD_PER_MTOK.cacheRead) / m +
        ((u.cache_creation_input_tokens ?? 0) * PRICE_USD_PER_MTOK.cacheWrite) / m
    );
}

export const usdToGhs = (usd: number) => usd * USD_TO_GHS;
