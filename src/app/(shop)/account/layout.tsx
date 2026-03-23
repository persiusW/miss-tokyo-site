import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";

const NAV: { href: string; label: string }[] = [
    { href: "/account/orders",    label: "Orders" },
    { href: "/account/profile",   label: "Profile" },
    { href: "/account/addresses", label: "Addresses" },
];

export default async function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // SEC-15: server-side auth guard — redirect fires before any HTML is sent.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/account");
    }

    // Server action — no client JS required for sign-out.
    async function signOut() {
        "use server";
        const serverClient = await createClient();
        await serverClient.auth.signOut();
        redirect("/");
    }

    return (
        <div className="pt-32 pb-32 px-6 md:px-12 max-w-5xl mx-auto">
            <header className="mb-12">
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">My Account</h1>
                {user.email && (
                    <p className="text-neutral-500 text-sm">{user.email}</p>
                )}
            </header>

            <div className="flex gap-0 border-b border-neutral-200 mb-12 overflow-x-auto">
                {NAV.map(({ href, label }) => (
                    <Link
                        key={href}
                        href={href}
                        className="px-6 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors whitespace-nowrap border-transparent text-neutral-400 hover:text-black"
                    >
                        {label}
                    </Link>
                ))}

                <form action={signOut} className="ml-auto">
                    <button
                        type="submit"
                        className="px-6 py-3 text-xs uppercase tracking-widest text-neutral-400 hover:text-black transition-colors whitespace-nowrap"
                    >
                        Sign Out
                    </button>
                </form>
            </div>

            {children}
        </div>
    );
}
