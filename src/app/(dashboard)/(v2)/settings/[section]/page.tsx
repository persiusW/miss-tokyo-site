import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { v2AreaOn } from "@/lib/admin/v2/server";
import { SettingsV2Page } from "@/components/admin/v2/settings/SettingsPage";
import { SECTION_LEGACY_HREF, sectionByKey } from "@/components/admin/v2/settings/schema";

type Params = { params: Promise<{ section: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { section } = await params;
    return { title: `${sectionByKey(section)?.t ?? "Settings"} · Settings` };
}

// /settings/<section>. While the Settings area is off it goes back to the
// old page's matching tab (/settings/assistants → /settings/ai).
export default async function SettingsSectionPage({ params, searchParams }: Params) {
    const { section } = await params;
    if (!(await v2AreaOn("settings"))) redirect(SECTION_LEGACY_HREF[section] ?? "/settings");
    if (!sectionByKey(section)) redirect("/settings");
    const sp = await searchParams;
    const hl = typeof sp.hl === "string" ? sp.hl : null;
    return <SettingsV2Page section={section} hl={hl} />;
}
