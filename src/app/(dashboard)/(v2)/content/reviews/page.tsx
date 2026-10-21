import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { ContentFrame, LoadFailed } from "@/components/admin/v2/content/shared";
import { ReviewsTab } from "@/components/admin/v2/content/ReviewsTab";
import { loadReviews } from "@/components/admin/v2/content/data";

export const metadata = { title: "Reviews · Content · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

export default async function ContentReviewsPage() {
    const { allowed } = await requireV2Page("content", "/content/reviews", ["admin", "owner"]);
    if (!allowed) return <Denied title="Content" />;
    const data = await loadReviews();
    return (
        <ContentFrame tab="reviews">
            {data ? <ReviewsTab reviews={data} /> : <LoadFailed what="the reviews" />}
        </ContentFrame>
    );
}
