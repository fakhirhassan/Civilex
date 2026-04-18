import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Single instance created once at module load time.
// Since this module is only ever imported in browser context (it uses createBrowserClient),
// the module cache guarantees exactly one instance per page load.
let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
    );
  }

  _client = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      // Disable navigator.locks serialization. We have a singleton client and
      // don't need cross-tab coordination for this app. The default lock
      // conflicts with React dev-mode double-mounting and causes
      // "Lock broken by another request with the 'steal' option" errors.
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  });
  return _client;
}

// Export a direct reference so components can import the instance without calling createClient()
export function getClient(): SupabaseClient {
  return createClient();
}
