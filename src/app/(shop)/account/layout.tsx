import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { AccountShell } from "./AccountShell";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login?next=/account");

    async function signOut() {
        "use server";
        const serverClient = await createClient();
        await serverClient.auth.signOut();
        redirect("/");
    }

    return (
        <AccountShell
            userId={user.id}
            userEmail={user.email ?? ""}
            onSignOut={signOut}
        >
            {children}
        </AccountShell>
    );
}
