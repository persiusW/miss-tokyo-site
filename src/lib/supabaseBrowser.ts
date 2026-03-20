// Re-exports the unified client from supabase.ts so there is only one
// GoTrueClient instance in the browser (eliminates the "Multiple instances" warning).
export { createClient } from './supabase';
