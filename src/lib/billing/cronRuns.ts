// When scheduled jobs ran, for Admin Tools › System. Recording never stops a job.
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const db = supabaseAdmin as any;

export async function withCronRun<T>(job: string, fn: () => Promise<T>, note: (r: T) => string): Promise<T> {
    const { data } = await db.from("cron_runs").insert({ job }).select("id").maybeSingle().then((r: any) => r, () => ({ data: null }));
    const id = data?.id ?? null;
    const finish = async (ok: boolean, text: string) => {
        if (id == null) return;
        const { error } = await db.from("cron_runs").update({ finished_at: new Date().toISOString(), ok, note: text.slice(0, 300) }).eq("id", id);
        if (error) console.error("[cron_runs] not recorded", { job, code: error.code });
    };
    try {
        const r = await fn();
        await finish(true, note(r));
        return r;
    } catch (e) {
        await finish(false, "failed");
        throw e;
    }
}
