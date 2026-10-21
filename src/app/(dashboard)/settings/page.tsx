import type { Metadata } from "next";
import { v2AreaOn } from "@/lib/admin/v2/server";
import { SettingsV2Page } from "@/components/admin/v2/settings/SettingsPage";
import LegacySettingsPage from "./LegacySettingsPage";

export const metadata: Metadata = { title: "Settings" };

// Shared path: the old tabbed page while the Settings area is off, the new
// Settings home once it's on.
export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    if (!(await v2AreaOn("settings"))) return <LegacySettingsPage />;
    const sp = await searchParams;
    const tab = typeof sp.tab === "string" ? sp.tab : null;
    return <SettingsV2Page section={null} tab={tab} />;
}
