// Server side of the new Settings pages: role check, data, then the client
// app. Owners and admins see every section; anyone on staff can open their
// own account. Checked here and again in every server action.
import { redirect } from "next/navigation";
import { Denied } from "@/components/admin/ui";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireV2Page } from "@/lib/admin/v2/server";
import { loadAiActivity, loadSettingsData } from "./load";
import { SettingsApp } from "./SettingsApp";
import { sectionByKey } from "./schema";

export async function SettingsV2Page({ section, hl, tab }: { section: string | null; hl?: string | null; tab?: string | null }) {
    const sec = section ? sectionByKey(section) : null;
    const path = section ? `/settings/${section}` : "/settings";
    const roles = sec?.mine ? (["admin", "owner", "sales_staff"] as const) : (["admin", "owner"] as const);
    const auth = await requireV2Page("settings", path, [...roles]);
    if (!auth.allowed) return <Denied title={sec?.t ?? "Settings"} />;

    const sb = await createClient();
    const [{ data: { user } }, { data: profile }] = await Promise.all([
        sb.auth.getUser(),
        supabaseAdmin.from("profiles").select("full_name").eq("id", auth.userId).maybeSingle(),
    ]);
    const meta = (user?.user_metadata ?? {}) as { full_name?: string };
    const me = { name: profile?.full_name || meta.full_name || "", email: user?.email ?? "" };

    const data = await loadSettingsData(auth.role, me);
    // A section that only shows while its new home is off (Site content) sends
    // people to that home once it's on.
    if (sec?.show && !sec.show(data.ctx)) redirect(sec.k === "content" ? "/content" : "/settings");
    const ai = section === "assistants"
        ? await loadAiActivity(auth.role, auth.role === "admin" ? Number(data.saved["ai.admin_cost_markup_pct"]) || 0 : null)
        : null;
    return <SettingsApp data={data} section={section} ai={ai} hl={hl ?? null} legacyTab={tab ?? null} />;
}
