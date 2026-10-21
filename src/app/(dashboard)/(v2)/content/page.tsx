import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { ContentFrame, LoadFailed } from "@/components/admin/v2/content/shared";
import { HomeTab } from "@/components/admin/v2/content/HomeTab";
import { loadHome } from "@/components/admin/v2/content/data";

export const metadata = { title: "Content · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

// Content › Home page. Owners and admins only (the old /cms had the same gate).
export default async function ContentHomePage() {
    const { allowed } = await requireV2Page("content", "/content", ["admin", "owner"]);
    if (!allowed) return <Denied title="Content" />;
    const data = await loadHome();
    return (
        <ContentFrame tab="home">
            {data ? <HomeTab data={data} /> : <LoadFailed what="the home page settings" />}
        </ContentFrame>
    );
}
