import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { AccountShell } from "./AccountShell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login?next=/account");

    return (
        <AccountShell
            userId={user.id}
            userEmail={user.email ?? ""}
        >
            {children}
        </AccountShell>
    );
}
