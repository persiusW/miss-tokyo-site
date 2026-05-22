module.exports = [
"[project]/src/lib/utils/getUrl.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getUrl",
    ()=>getUrl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
async function getUrl() {
    const headersList = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])();
    const host = headersList.get("host") || ("TURBOPACK compile-time value", "http://localhost:3000") || "misstokyo.shop";
    const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
}
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/src/lib/sms.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "injectSmsVars",
    ()=>injectSmsVars,
    "sendSMS",
    ()=>sendSMS
]);
/**
 * SMS utility via mNotify API v2 (api.mnotify.com).
 * Set MNOTIFY_API_KEY and MNOTIFY_SENDER_ID in your .env.local
 *
 * mNotify Quick SMS:
 *   POST https://api.mnotify.com/api/sms/quick?key={API_KEY}
 *   Content-Type: application/json
 *   Body: { recipient, sender, message, is_schedule, schedule_date }
 *
 * Success response: { status: "success", code: "2000", message: "...", summary: { ... } }
 */ const MNOTIFY_ENDPOINT = "https://api.mnotify.com/api/sms/quick";
function injectSmsVars(template, vars) {
    return Object.entries(vars).reduce((str, [key, val])=>str.replaceAll(`{${key}}`, val), template);
}
function normalizePhone(phone) {
    const digits = phone.replace(/\D/g, "").trim();
    if (digits.startsWith("233")) return "0" + digits.slice(3); // mNotify prefers local format
    if (digits.startsWith("0")) return digits;
    return digits;
}
function stripQuotes(val) {
    return val.trim().replace(/^["']|["']$/g, "");
}
async function sendSMS(payload) {
    const rawKey = process.env.MNOTIFY_API_KEY;
    if (!rawKey) {
        console.warn("[sms] MNOTIFY_API_KEY not set — SMS skipped.");
        return {
            ok: false,
            error: "MNOTIFY_API_KEY is not set in environment variables"
        };
    }
    const apiKey = stripQuotes(rawKey);
    const rawId = payload.sender || process.env.MNOTIFY_SENDER_ID || "MISSTOKYO";
    const senderId = stripQuotes(rawId);
    const recipient = (Array.isArray(payload.to) ? payload.to : [
        payload.to
    ]).map(normalizePhone);
    const url = `${MNOTIFY_ENDPOINT}?key=${apiKey}`;
    const body = {
        recipient,
        sender: senderId,
        message: payload.message,
        is_schedule: false,
        schedule_date: ""
    };
    console.log(`[sms] POST ${MNOTIFY_ENDPOINT}?key=***`);
    console.log(`[sms] recipient: ${recipient.join(",")} sender: "${senderId}"`);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        const text = await res.text();
        console.log(`[sms] HTTP ${res.status}:`, text.slice(0, 300));
        if (text.trimStart().startsWith("<!")) {
            return {
                ok: false,
                error: "mNotify returned HTML — check API key or endpoint"
            };
        }
        let json = {};
        try {
            json = JSON.parse(text);
        } catch  {}
        if (json?.status === "success" || json?.code === "2000") {
            return {
                ok: true
            };
        }
        const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
        console.error("[sms] mNotify error:", msg);
        return {
            ok: false,
            error: msg
        };
    } catch (err) {
        console.error("[sms] Unexpected error:", err);
        return {
            ok: false,
            error: err?.message || "Unknown error"
        };
    }
}
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/src/lib/utils/logActivity.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "logActivity",
    ()=>logActivity
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseAdmin.ts [app-rsc] (ecmascript)");
;
function computeDiff(oldObj, newObj) {
    if (!oldObj || !newObj) return null;
    const changes = {};
    const allKeys = Array.from(new Set([
        ...Object.keys(oldObj),
        ...Object.keys(newObj)
    ]));
    for (const key of allKeys){
        // Skip common metadata
        if ([
            "id",
            "created_at",
            "updated_at",
            "slug"
        ].includes(key)) continue;
        const oldVal = oldObj[key];
        const newVal = newObj[key];
        // Deep equal check for arrays/objects (simplified)
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes[key] = {
                from: oldVal,
                to: newVal
            };
        }
    }
    return Object.keys(changes).length > 0 ? changes : null;
}
async function logActivity({ userId, userRole, actionType, resource, resourceId, oldData, newData, details = {} }) {
    if (userRole === "admin") {
        return; // We only log CRUD tasks for owner and sales_staff
    }
    // Compute diff for UPDATE actions or if both exist
    const diff = oldData && newData ? computeDiff(oldData, newData) : null;
    const finalDetails = {
        ...details,
        resource_name: newData?.name || oldData?.name || details?.name || details?.full_name,
        changes: diff
    };
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("activity_logs").insert({
            user_id: userId,
            user_role: userRole,
            action_type: actionType,
            resource,
            resource_id: resourceId,
            details: finalDetails
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
}),
"[project]/src/app/(dashboard)/settings/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"400a18c9a7d32c2174cc981a7b14c4d51b65064595":"sendPasswordResetLink","4045a8f3c29aa4fdd90b0e4f4beead23aad28fcf69":"inviteTeamMember","40dd4b387ad58896edeb12776262a085056554847f":"removeTeamMember"},"",""] */ __turbopack_context__.s([
    "inviteTeamMember",
    ()=>inviteTeamMember,
    "removeTeamMember",
    ()=>removeTeamMember,
    "sendPasswordResetLink",
    ()=>sendPasswordResetLink
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseServer.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseAdmin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$getUrl$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/getUrl.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$resend$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/resend/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/sms.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$logActivity$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/logActivity.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
const resend = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$resend$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Resend"](process.env.RESEND_API_KEY);
async function inviteTeamMember(data) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    // Get caller's role
    const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
    const token = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomBytes(32).toString('hex');
    const dynamicHost = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$getUrl$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUrl"])();
    const inviteLink = `${dynamicHost}/invite?token=${token}`;
    const { error: insertError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("team_invitations").insert({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        token,
        invited_by: userData.user.id
    });
    if (insertError) {
        console.error("Invite insertion error:", insertError);
        return {
            success: false,
            error: "Failed to create invitation record."
        };
    }
    // LOG ACTIVITY
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$logActivity$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["logActivity"])({
        userId: userData.user.id,
        userRole: callerProfile?.role || 'admin',
        actionType: "INVITE",
        resource: "team",
        details: {
            email: data.email,
            role: data.role
        }
    });
    const message = `You have been invited to collaborate on Miss Tokyo as a ${data.role}. Join here: ${inviteLink}`;
    // 1. Format Phone Number (Ghana standard +233)
    let formattedPhone = data.phone;
    if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\D/g, "");
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "233" + formattedPhone.slice(1);
        } else if (!formattedPhone.startsWith("233")) {
            formattedPhone = "233" + formattedPhone;
        }
        formattedPhone = "+" + formattedPhone;
    }
    try {
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop",
            to: data.email,
            subject: "Invitation to Join Miss Tokyo Team",
            text: message,
            html: `<p>You have been invited to collaborate on Miss Tokyo as a <strong>${data.role}</strong>.</p><p><a href="${inviteLink}">Click here to accept your invitation</a></p>`
        });
        if (formattedPhone) {
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sms$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendSMS"])({
                    to: formattedPhone,
                    message
                });
            } catch (smsErr) {
                console.error("SMS failed, but email sent:", smsErr);
                return {
                    success: true,
                    warning: 'Email sent, but SMS failed.'
                };
            }
        }
        return {
            success: true
        };
    } catch (err) {
        console.error("Failed to send invite emails:", err);
        return {
            success: false,
            error: "Invitation saved, but failed to dispatch communications."
        };
    }
}
async function removeTeamMember(userId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
        return {
            success: false,
            error: "Unauthorized"
        };
    }
    // CRITICAL SECURITY: Verify caller is an admin or owner
    const { data: callerData } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
    if (!callerData || callerData.role !== 'admin' && callerData.role !== 'owner') {
        return {
            success: false,
            error: "Forbidden: Only admins and owners can remove members."
        };
    }
    // Demote role to 'customer' so they lose dashboard access without destroying
    // their account or triggering FK constraint failures on orders/pos_sessions/logs.
    const { error: demoteError } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("profiles").update({
        role: "customer"
    }).eq("id", userId);
    if (demoteError) {
        console.error("Failed to demote user ID", userId, demoteError);
        return {
            success: false,
            error: "Failed to remove team member."
        };
    }
    // Force sign-out so the removed member's session ends immediately.
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.admin.signOut(userId, "global");
    // LOG ACTIVITY
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$logActivity$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["logActivity"])({
        userId: userData.user.id,
        userRole: callerData.role,
        actionType: "REMOVE_MEMBER",
        resource: "team",
        resourceId: userId
    });
    return {
        success: true
    };
}
async function sendPasswordResetLink(targetEmail) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseServer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return {
        success: false,
        error: "Unauthorized"
    };
    const { data: callerData } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
    if (!callerData || callerData.role !== "admin" && callerData.role !== "owner") {
        return {
            success: false,
            error: "Forbidden: Only admins and owners can send reset links."
        };
    }
    const { createClient: createServiceClient } = await __turbopack_context__.A("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-rsc] (ecmascript, async loader)");
    const adminClient = createServiceClient(("TURBOPACK compile-time value", "https://wcygtmcnysbhzgcicocm.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    const siteUrl = ("TURBOPACK compile-time value", "http://localhost:3000") || "https://misstokyo.shop";
    // Fetch biz name so the email header matches the rest of the system
    const { data: biz } = await adminClient.from("business_settings").select("business_name").eq("id", "default").single();
    const bizName = biz?.business_name || "Miss Tokyo";
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: targetEmail,
        options: {
            redirectTo: `${siteUrl}/account/reset-password`
        }
    });
    if (linkError || !linkData) {
        console.error("[sendPasswordResetLink] generateLink failed:", linkError);
        return {
            success: false,
            error: "Failed to generate reset link."
        };
    }
    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) return {
        success: false,
        error: "Could not retrieve reset link."
    };
    const { sendEmail } = await __turbopack_context__.A("[project]/src/lib/email.ts [app-rsc] (ecmascript, async loader)");
    const { ok, error: emailError } = await sendEmail({
        to: targetEmail,
        subject: `Reset your ${bizName} password`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Password Reset</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Reset your password
    </h2>

    <p style="font-size: 14px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      An admin has requested a password reset for your account. Click the button below to set a new password. This link expires in 1 hour.
    </p>

    <a href="${resetLink}" style="display: block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 16px 32px; text-align: center; font-weight: 700; margin-bottom: 32px;">
      Reset My Password →
    </a>

    <p style="font-size: 13px; color: #737373; line-height: 1.8; margin: 0 0 32px;">
      If you did not expect this email, you can safely ignore it — your account remains secure.
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${bizName}
      </p>
    </div>
  </div>
</body>
</html>`
    });
    if (!ok) {
        console.error("[sendPasswordResetLink] email failed:", emailError);
        return {
            success: false,
            error: "Reset link generated but email failed to send."
        };
    }
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    inviteTeamMember,
    removeTeamMember,
    sendPasswordResetLink
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(inviteTeamMember, "4045a8f3c29aa4fdd90b0e4f4beead23aad28fcf69", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(removeTeamMember, "40dd4b387ad58896edeb12776262a085056554847f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(sendPasswordResetLink, "400a18c9a7d32c2174cc981a7b14c4d51b65064595", null);
}),
"[project]/.next-internal/server/app/(dashboard)/settings/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/(dashboard)/settings/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/actions.ts [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/.next-internal/server/app/(dashboard)/settings/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/(dashboard)/settings/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "400a18c9a7d32c2174cc981a7b14c4d51b65064595",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sendPasswordResetLink"],
    "4045a8f3c29aa4fdd90b0e4f4beead23aad28fcf69",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inviteTeamMember"],
    "40dd4b387ad58896edeb12776262a085056554847f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["removeTeamMember"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$settings$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(dashboard)/settings/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/(dashboard)/settings/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$dashboard$292f$settings$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(dashboard)/settings/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4c90fce3._.js.map