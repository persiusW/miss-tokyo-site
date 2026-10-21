"use client";

// One server action at a time per control: busy while it runs, a calm toast
// for the outcome, and a refresh so the page shows what was saved.
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/admin/ui";

type Res = { ok: true } | { ok: false; error: string };

export function useRun() {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const run = useCallback(async <T extends Res>(key: string, fn: () => Promise<T>, done?: string | ((r: T & { ok: true }) => void)): Promise<(T & { ok: true }) | null> => {
        setBusy(key);
        try {
            const r = await fn().catch(() => ({ ok: false as const, error: "Something happened. Please try again." }));
            if (!r.ok) { toast.error((r as { error: string }).error); return null; }
            if (typeof done === "string") toast.success(done);
            else done?.(r as T & { ok: true });
            router.refresh();
            return r as T & { ok: true };
        } finally {
            setBusy(null);
        }
    }, [router]);
    return { busy, run };
}
