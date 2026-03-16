import { createClient as createServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is authorized to invite
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!profile || !["owner", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    // 1. Invite User via Admin Auth API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${new URL(req.url).origin}/admin/login`,
        data: { role: role }
    });

    let userId: string | undefined;

    if (inviteError) {
        if (inviteError.message.includes("already been registered")) {
            // Fetch existing user to get ID
            const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (existingUser) {
                userId = existingUser.id;
            } else {
                return NextResponse.json({ error: "Collision detected but user record inaccessible." }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: inviteError.message }, { status: 500 });
        }
    } else {
        userId = inviteData?.user?.id;
    }

    // 2. Provision or Update the Profile
    if (userId) {
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: userId,
                email: email.toLowerCase(),
                role: role,
                full_name: email.split('@')[0], // Placeholder name until they set it
            }, { onConflict: 'email' });

        if (profileError) {
            console.error("Profile provision error:", profileError);
        }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Invite API Exception:", err);
    return NextResponse.json({ error: "Internal system error during dispatch." }, { status: 500 });
  }
}
