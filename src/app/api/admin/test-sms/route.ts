import { NextResponse } from "next/server";
import { sendSMS } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
    try {
        const serverClient = await createClient();
        const { data: { user } } = await serverClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        if (!caller || !["admin", "owner"].includes(caller.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { phone, message } = await req.json();
        if (!phone) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

        const bizName = process.env.BIZ_NAME || "Miss Tokyo";
        const smsMessage = message?.trim()
            || `TEST: Your ${bizName} order #TEST1234 is confirmed! Check your email for the full receipt. Thank you.`;

        const result = await sendSMS({ to: phone, message: smsMessage });

        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
        return NextResponse.json({ status: "sent" });
    } catch (err: any) {
        console.error("[test-sms]", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
