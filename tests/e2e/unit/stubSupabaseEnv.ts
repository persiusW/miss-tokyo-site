// Import first in a unit test whose module graph reaches supabaseAdmin: it
// builds a client at import time and needs a URL. Nothing here talks to a
// database; real values, when present, are left alone.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "unit-test-placeholder";
export {};
