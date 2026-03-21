import { createClient } from "@supabase/supabase-js";

// Server-side only — uses service role key to bypass RLS.
// NEVER import this in client components.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
    console.error("CRITICAL: Service Role Key missing from Process Env");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || "", {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
