import { createClient } from "@supabase/supabase-js";

// Server-side only — uses service role key to bypass RLS.
// NEVER import this in client components.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!serviceRoleKey && process.env.NODE_ENV !== "test") {
    console.error("[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail.");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
