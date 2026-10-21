import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { ContentFrame, LoadFailed } from "@/components/admin/v2/content/shared";
import { PagesTab } from "@/components/admin/v2/content/PagesTab";
import { loadPages } from "@/components/admin/v2/content/data";

export const metadata = { title: "Pages · Content · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

export default async function ContentPagesPage() {
    const { allowed } = await requireV2Page("content", "/content/pages", ["admin", "owner"]);
    if (!allowed) return <Denied title="Content" />;
    const data = await loadPages();
    return (
        <ContentFrame tab="pages">
            {data ? <PagesTab data={data} /> : <LoadFailed what="the shop pages" />}
        </ContentFrame>
    );
}
