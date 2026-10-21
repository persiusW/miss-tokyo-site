import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { v2View } from "@/lib/admin/v2/server";
import { UiKit } from "@/components/admin/v2/kit/UiKit";

export const metadata = { title: "Component kit · Miss Tokyo admin" };

// The admin v2 component kit. Admin only and not in the nav, like /test-orders.
export default async function UiKitPage() {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) redirect("/admin/login?next=/ui-kit");
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") redirect("/overview");
    const { shell } = await v2View();
    if (!shell) redirect("/overview");
    return <UiKit />;
}
