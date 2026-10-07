import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service role key.
 * Bypasses RLS — use exclusively inside `/api/*` and other server modules.
 */
export function createServiceSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error(
      "Subscription database not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True when service-role Supabase env is present (does not prove network reachability). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/**
 * Map raw Supabase / undici failures into operator-safe copy.
 * Node often surfaces unreachable PostgREST as `TypeError: fetch failed`.
 */
export function mapSupabaseError(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : fallback;
  const msg = raw.trim() || fallback;
  if (
    /fetch failed|Failed to fetch|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|network|getaddrinfo|certificate|UND_ERR/i.test(
      msg,
    )
  ) {
    return "Subscription database unreachable — check Supabase URL / service role key on the server";
  }
  if (/Could not find the table|relation .* does not exist/i.test(msg)) {
    return "agent_subscriptions table missing — run Supabase migration 002";
  }
  if (/Missing NEXT_PUBLIC_SUPABASE|not configured/i.test(msg)) {
    return msg;
  }
  // Strip noisy "TypeError: " prefix from wrapped undici errors.
  return msg.replace(/^TypeError:\s*/i, "");
}
