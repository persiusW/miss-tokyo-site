import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { ContentFrame, LoadFailed } from "@/components/admin/v2/content/shared";
import { TextTab } from "@/components/admin/v2/content/TextTab";
import { loadWording } from "@/components/admin/v2/content/data";

export const metadata = { title: "Shop wording · Content · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

export default async function ContentTextPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    const { allowed } = await requireV2Page("content", "/content/text", ["admin", "owner"]);
    if (!allowed) return <Denied title="Content" />;
    const [data, { view }] = await Promise.all([loadWording(), searchParams]);
    return (
        <ContentFrame tab="text">
            {data ? <TextTab wording={data.wording} images={data.images} view={view === "images" ? "images" : "wording"} /> : <LoadFailed what="the shop wording" />}
        </ContentFrame>
    );
}
