import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type AgentSubscriptionRecord = {
  id: string;
  walletAddress: string;
  agentId: string;
  status: "active" | "expired" | "cancelled";
  paymentAsset: "USDC" | "NOVA";
  amountPaid: string;
  paymentTxHash: string | null;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  autoRenew: boolean;
};

type SubRow = {
  id: string;
  wallet_address: string;
  agent_id: string;
  status: string;
  payment_asset: string;
  amount_paid: string;
  payment_tx_hash: string | null;
  starts_at: string;
  expires_at: string;
  created_at: string;
  auto_renew?: boolean | null;
};

const SUB_SELECT =
  "id, wallet_address, agent_id, status, payment_asset, amount_paid, payment_tx_hash, starts_at, expires_at, created_at, auto_renew";

function db() {
  return createServiceSupabaseClient();
}

function isBech32Address(address: string): boolean {
  return /^erd1[a-z0-9]{58}$/i.test(address.trim());
}

function rowToRecord(row: SubRow): AgentSubscriptionRecord {
  const status =
    row.status === "active" || row.status === "expired" || row.status === "cancelled"
      ? row.status
      : "expired";
  const paymentAsset = row.payment_asset === "NOVA" ? "NOVA" : "USDC";
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    agentId: row.agent_id,
    status,
    paymentAsset,
    amountPaid: row.amount_paid,
    paymentTxHash: row.payment_tx_hash,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    autoRenew: row.auto_renew !== false,
  };
}

/** True when subscription exists, status=active, and expires_at is in the future. */
export function isSubscriptionActive(
  record: AgentSubscriptionRecord | null,
  now = new Date(),
): boolean {
  if (!record || record.status !== "active") return false;
  return new Date(record.expiresAt).getTime() > now.getTime();
}

export async function getActiveAgentSubscription(
  walletRaw: string,
  agentId: string,
): Promise<AgentSubscriptionRecord | null> {
  const wallet = walletRaw.trim().toLowerCase();
  if (!isBech32Address(wallet) || !agentId.trim()) return null;

  const { data, error } = await db()
    .from("agent_subscriptions")
    .select(SUB_SELECT)
    .eq("wallet_address", wallet)
    .eq("agent_id", agentId.trim())
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? rowToRecord(data as SubRow) : null;
}

export async function listActiveSubscriptionsForWallet(
  walletRaw: string,
): Promise<AgentSubscriptionRecord[]> {
  const wallet = walletRaw.trim().toLowerCase();
  if (!isBech32Address(wallet)) return [];

  const { data, error } = await db()
    .from("agent_subscriptions")
    .select(SUB_SELECT)
    .eq("wallet_address", wallet)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (error) throw new Error(error.message);
  return ((data ?? []) as SubRow[]).map(rowToRecord);
}

/** Active + expired rows for billing history / management. */
export async function listBillingSubscriptionsForWallet(
  walletRaw: string,
): Promise<AgentSubscriptionRecord[]> {
  const wallet = walletRaw.trim().toLowerCase();
  if (!isBech32Address(wallet)) return [];

  const { data, error } = await db()
    .from("agent_subscriptions")
    .select(SUB_SELECT)
    .eq("wallet_address", wallet)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw new Error(error.message);
  return ((data ?? []) as SubRow[]).map(rowToRecord);
}

export async function setSubscriptionAutoRenew(params: {
  walletAddress: string;
  subscriptionId: string;
  autoRenew: boolean;
}): Promise<AgentSubscriptionRecord> {
  const wallet = params.walletAddress.trim().toLowerCase();
  if (!isBech32Address(wallet)) {
    throw new Error("Invalid MultiversX address");
  }

  const { data, error } = await db()
    .from("agent_subscriptions")
    .update({ auto_renew: params.autoRenew })
    .eq("id", params.subscriptionId)
    .eq("wallet_address", wallet)
    .select(SUB_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update auto-renew");
  }
  return rowToRecord(data as SubRow);
}

export async function findSubscriptionByPaymentTx(
  paymentTxHash: string,
): Promise<AgentSubscriptionRecord | null> {
  const key = paymentTxHash.trim().toLowerCase();
  if (!key) return null;
  const { data, error } = await db()
    .from("agent_subscriptions")
    .select(SUB_SELECT)
    .eq("payment_tx_hash", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToRecord(data as SubRow) : null;
}

export async function activateAgentSubscription(params: {
  walletAddress: string;
  agentId: string;
  paymentAsset: "USDC" | "NOVA";
  amountPaid: string;
  paymentTxHash: string;
  durationDays?: number;
}): Promise<AgentSubscriptionRecord> {
  const wallet = params.walletAddress.trim().toLowerCase();
  if (!isBech32Address(wallet)) {
    throw new Error("Invalid MultiversX address");
  }

  const existing = await findSubscriptionByPaymentTx(params.paymentTxHash);
  if (existing) return existing;

  const now = new Date();
  const days = params.durationDays ?? 30;
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Expire any previous active row for this wallet+agent.
  await db()
    .from("agent_subscriptions")
    .update({ status: "expired" })
    .eq("wallet_address", wallet)
    .eq("agent_id", params.agentId)
    .eq("status", "active");

  const { data, error } = await db()
    .from("agent_subscriptions")
    .insert({
      wallet_address: wallet,
      agent_id: params.agentId,
      status: "active",
      payment_asset: params.paymentAsset,
      amount_paid: params.amountPaid,
      payment_tx_hash: params.paymentTxHash.trim().toLowerCase(),
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      auto_renew: true,
    })
    .select(SUB_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to activate subscription");
  }
  return rowToRecord(data as SubRow);
}
