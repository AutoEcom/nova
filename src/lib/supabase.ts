/**
 * Supabase clients for EVOLGO.
 * - Browser/anon: `createBrowserSupabaseClient`
 * - Server/service role (API routes): `createServiceSupabaseClient`
 */
export { createBrowserSupabaseClient } from "@/lib/supabase/client";
export { createServiceSupabaseClient } from "@/lib/supabase/server";
