import { createClient } from "@supabase/supabase-js";
import InviteForm from "./InviteForm";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams;

    if (!token) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center space-y-4 max-w-sm w-full border border-neutral-200">
                    <h1 className="font-serif text-2xl tracking-widest uppercase text-rose-600">Invalid Link</h1>
                    <p className="text-sm text-neutral-500">No invitation token was provided in the URL.</p>
                </div>
            </div>
        );
    }

    // Bypass RLS to check token validity
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: invite, error } = await supabaseAdmin
        .from("team_invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

    if (error || !invite) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center space-y-4 max-w-sm w-full border border-neutral-200">
                    <h1 className="font-serif text-2xl tracking-widest uppercase text-rose-600">Expired Link</h1>
                    <p className="text-sm text-neutral-500">This invitation link is invalid, expired, or has already been accepted.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
            <div className="mb-8 text-center space-y-2">
                <h1 className="font-serif text-3xl tracking-widest uppercase">Miss Tokyo</h1>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Atelier Team Portal</p>
            </div>
            
            <InviteForm
                inviteId={invite.id}
                email={invite.email}
                fullName={invite.full_name}
                role={invite.role}
                token={token}
            />
        </div>
    );
}
