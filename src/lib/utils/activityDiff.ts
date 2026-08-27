/** Never interesting in a diff, and noisy in every single one. */
const IGNORED_KEYS = ["id", "created_at", "updated_at", "slug"];

export type ActivityChanges = Record<string, { from: any; to: any }>;

/**
 * What actually changed, and nothing else.
 *
 * `newData` is the update payload, not a full row — it carries only the columns
 * being written. Diffing every key of `oldData` against it therefore reported
 * every untouched column as `{ from: <value> }` with an undefined `to`, which
 * JSON renders as `{"from": null}`. A one-field edit logged thirty phantom
 * changes and buried the real one under them. Walk the payload instead: a key
 * absent from it was not part of this update.
 *
 * Kept free of imports so it can be unit-tested without pulling in a Supabase
 * client that wants credentials at module load.
 */
export function computeDiff(oldObj: any, newObj: any): ActivityChanges | null {
    if (!oldObj || !newObj) return null;
    const changes: ActivityChanges = {};

    for (const key of Object.keys(newObj)) {
        if (IGNORED_KEYS.includes(key)) continue;

        const oldVal = oldObj[key];
        const newVal = newObj[key];

        // Writing a column back with the value it already held is not a change.
        // Deep compare so arrays and jsonb do not report as changed every time.
        if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

        changes[key] = { from: oldVal ?? null, to: newVal ?? null };
    }

    return Object.keys(changes).length > 0 ? changes : null;
}
