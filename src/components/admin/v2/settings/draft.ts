"use client";

// The Settings save model's draft: edits stay here, per key, until the section
// is saved or discarded. A module store, so moving between sections keeps
// what you typed; the shell's leave guard discards it on the way out.
import { useSyncExternalStore } from "react";
import { sameKeyVal, type Val, type Values } from "./schema";

let draft: Values = {};
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export const draftStore = {
    get: () => draft,
    set(key: string, v: Val, saved: Val | undefined) {
        const next = { ...draft };
        if (sameKeyVal(key, v, saved)) delete next[key];
        else next[key] = v;
        draft = next;
        emit();
    },
    clear(keys?: string[]) {
        if (!keys) draft = {};
        else { const next = { ...draft }; for (const k of keys) delete next[k]; draft = next; }
        emit();
    },
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

const EMPTY: Values = {};
export function useDraft(): Values {
    return useSyncExternalStore(draftStore.subscribe, draftStore.get, () => EMPTY);
}

/** Keys in `keys` whose draft differs from the saved value. */
export function changedKeys(d: Values, saved: Values, keys: string[]): string[] {
    return keys.filter(k => k in d && !sameKeyVal(k, d[k], saved[k]));
}
