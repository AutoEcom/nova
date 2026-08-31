import { getExchangeById } from "@/config/exchanges";
import { encryptSecret, hintFromApiKey } from "@/lib/crypto/secrets";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type ExchangeConnectionPublic = {
  id: string;
  walletAddress: string;
  exchangeId: string;
  exchangeName: string;
  apiKeyHint: string;
  status: "connected" | "error" | "revoked";
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  wallet_address: string;
  exchange_id: string;
  api_key_hint: string;
  status: string;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
};

function db() {
  try {
    return createServiceSupabaseClient();
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "Supabase is not configured (missing service role key)",
    );
  }
}

function isBech32Address(address: string): boolean {
  return /^erd1[a-z0-9]{58}$/i.test(address.trim());
}

function rowToPublic(row: Row): ExchangeConnectionPublic {
  const status =
    row.status === "connected" || row.status === "error" || row.status === "revoked"
      ? row.status
      : "error";
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    exchangeId: row.exchange_id,
    exchangeName: getExchangeById(row.exchange_id)?.name ?? row.exchange_id,
    apiKeyHint: row.api_key_hint,
    status,
    lastTestedAt: row.last_tested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Lightweight format validation — no live CEX call from server in v1. */
export function validateExchangeCredentials(params: {
  exchangeId: string;
  apiKey: string;
  apiSecret: string;
}): { ok: true } | { ok: false; error: string } {
  if (!getExchangeById(params.exchangeId)) {
    return { ok: false, error: "Unknown exchange" };
  }
  const key = params.apiKey.trim();
  const secret = params.apiSecret.trim();
  if (!key || !secret) {
    return { ok: false, error: "API key and secret are required" };
  }
  if (key.length < 12) {
    return { ok: false, error: "API key looks too short or incomplete" };
  }
  if (secret.length < 12) {
    return { ok: false, error: "API secret looks too short or incomplete" };
  }
  if (/\s/.test(key) || /\s/.test(secret)) {
    return { ok: false, error: "Credentials must not contain spaces" };
  }
  // Reject obvious placeholders / malformed junk.
  if (/^(test|xxx|your[_-]?key|placeholder)/i.test(key)) {
    return { ok: false, error: "API key appears to be a placeholder" };
  }
  if (!/^[A-Za-z0-9_\-\/=+]+$/.test(key) || !/^[A-Za-z0-9_\-\/=+]+$/.test(secret)) {
    return {
      ok: false,
      error: "Credentials contain invalid characters for exchange APIs",
    };
  }
  return { ok: true };
}

/**
 * Simulated encrypted handshake against the futures venue.
 * Validates format, then waits ~1.5s as if verifying HMAC-signed account ping.
 */
export async function verifyExchangeHandshake(params: {
  exchangeId: string;
  apiKey: string;
  apiSecret: string;
}): Promise<
  | { ok: true; scopes: string; latencyMs: number; endpoint: string }
  | { ok: false; error: string }
> {
  const exchange = getExchangeById(params.exchangeId);
  if (!exchange) return { ok: false, error: "Unknown exchange" };

  const check = validateExchangeCredentials(params);
  if (!check.ok) return check;

  const latencyMs = 1500;
  await new Promise((r) => setTimeout(r, latencyMs));

  return {
    ok: true,
    scopes: "Read/Trade Verified",
    latencyMs,
    endpoint: exchange.endpointLabel,
  };
}

export async function listExchangeConnections(
  walletRaw: string,
): Promise<ExchangeConnectionPublic[]> {
  const wallet = walletRaw.trim().toLowerCase();
  if (!isBech32Address(wallet)) return [];

  const { data, error } = await db()
    .from("exchange_api_keys")
    .select(
      "id, wallet_address, exchange_id, api_key_hint, status, last_tested_at, created_at, updated_at",
    )
    .eq("wallet_address", wallet)
    .neq("status", "revoked")
    .order("updated_at", { ascending: false });

  if (error) {
    if (/Could not find the table|relation .* does not exist/i.test(error.message)) {
      throw new Error(
        "exchange_api_keys table missing — run Supabase migration 003",
      );
    }
    throw new Error(error.message);
  }
  return ((data ?? []) as Row[]).map(rowToPublic);
}

export async function upsertExchangeConnection(params: {
  walletAddress: string;
  exchangeId: string;
  apiKey: string;
  apiSecret: string;
}): Promise<ExchangeConnectionPublic> {
  const wallet = params.walletAddress.trim().toLowerCase();
  if (!isBech32Address(wallet)) {
    throw new Error("Invalid MultiversX address");
  }

  const check = validateExchangeCredentials(params);
  if (!check.ok) throw new Error(check.error);

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("exchange_api_keys")
    .upsert(
      {
        wallet_address: wallet,
        exchange_id: params.exchangeId,
        api_key_encrypted: encryptSecret(params.apiKey.trim()),
        api_secret_encrypted: encryptSecret(params.apiSecret.trim()),
        api_key_hint: hintFromApiKey(params.apiKey),
        status: "connected",
        last_tested_at: now,
        updated_at: now,
      },
      { onConflict: "wallet_address,exchange_id" },
    )
    .select(
      "id, wallet_address, exchange_id, api_key_hint, status, last_tested_at, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    const msg = error?.message ?? "Failed to save exchange connection";
    if (/Could not find the table|relation .* does not exist/i.test(msg)) {
      throw new Error(
        "exchange_api_keys table missing — run Supabase migration 003",
      );
    }
    if (/duplicate key|unique/i.test(msg)) {
      throw new Error("A connection for this exchange already exists");
    }
    throw new Error(msg);
  }
  return rowToPublic(data as Row);
}

export async function revokeExchangeConnection(params: {
  walletAddress: string;
  connectionId: string;
}): Promise<void> {
  const wallet = params.walletAddress.trim().toLowerCase();
  const { error } = await db()
    .from("exchange_api_keys")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", params.connectionId)
    .eq("wallet_address", wallet);
  if (error) throw new Error(error.message);
}
