// src/lib/refSearch.ts
//
// Orders and POS sessions carry a generated `ref` column (the uppercase 8-char
// id prefix shown on receipts) added by 20260821010000_searchable_display_refs.
// Searching it is the whole point of that migration — but a deploy can reach
// production before the migration is applied, and a PostgREST or() naming a
// column that does not exist fails the WHOLE query with 42703.
//
// That would take out search entirely rather than just the ref half of it, so
// every ref-aware search builds its clause here and retries without ref when
// the column is missing. Once the migration is applied the fallback never runs.

/** Postgres undefined_column. */
export const UNDEFINED_COLUMN = "42703";

export function isMissingColumn(
    error: { code?: string; message?: string } | null | undefined,
    column: string,
): boolean {
    if (!error) return false;
    return error.code === UNDEFINED_COLUMN && (error.message ?? "").includes(column);
}

/** Strip the characters PostgREST reads as or() syntax, and a leading #. */
export function sanitiseTerm(raw: string): string {
    return raw.trim().replace(/^#/, "").replace(/[%,()]/g, "");
}

/**
 * Builds an or() clause list, optionally leading with a ref prefix match.
 * `term` must already be sanitised.
 */
export function buildSearchClause(
    term: string,
    textColumns: string[],
    opts: { includeRef?: boolean } = {},
): string {
    const clauses = opts.includeRef !== false ? [`ref.ilike.${term.toUpperCase()}%`] : [];
    for (const col of textColumns) clauses.push(`${col}.ilike.%${term}%`);
    return clauses.join(",");
}

/**
 * Runs a ref-aware query, retrying without the ref clause if the column has
 * not been migrated in yet. `run` receives whether to include ref.
 */
export async function withRefFallback<T extends { error?: { code?: string; message?: string } | null }>(
    run: (includeRef: boolean) => PromiseLike<T>,
): Promise<T> {
    const first = await run(true);
    if (isMissingColumn(first.error, "ref")) {
        console.warn("[search] `ref` column missing — searching without it. Apply 20260821010000_searchable_display_refs.sql.");
        return run(false);
    }
    return first;
}
