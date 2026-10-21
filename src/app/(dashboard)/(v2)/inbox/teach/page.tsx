import type { Metadata } from "next";
import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { teachOn } from "@/lib/whatsapp/flags";
import { TeachPage } from "@/components/admin/v2/inbox/TeachPage";

export const metadata: Metadata = { title: "Teach the assistant" };
export const dynamic = "force-dynamic";

// /inbox/teach (was /customers/whatsapp/teach). Owners and admins teach the
// assistant; the admin also manages the answers Miss Tokyo AI gives staff.
export default async function InboxTeachRoute() {
    const auth = await requireV2Page("inbox", "/inbox/teach", ["admin", "owner"]);
    if (!auth.allowed) return <Denied title="Teach the assistant" />;
    return <TeachPage canTeach={teachOn()} isAdmin={auth.role === "admin"} />;
}
