import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Singleton for the browser bundle — one GoTrueClient instance across the whole app
let _browserClient: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Returns the appropriate Supabase client for the current context:
 * - Browser: cookie-aware createBrowserClient (shares the admin auth session)
 * - Server:  plain createClient (for public reads in Server Components)
 */
export function createClient() {
    if (typeof window === 'undefined') {
        return createSupabaseClient(supabaseUrl, supabaseAnonKey);
    }
    if (!_browserClient) {
        _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return _browserClient;
}

// Backward-compat named export — all `import { supabase } from "@/lib/supabase"` keep working
export const supabase = createClient();
