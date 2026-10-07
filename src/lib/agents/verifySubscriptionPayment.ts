import {
  agentSubscriptionNovaAmount,
  agentSubscriptionUsdc,
  getAgentById,
  resolveAgentId,
} from "@/config/agents";
import {
  API_URL,
  NOVA_DECIMALS,
  NOVA_TOKEN_ID,
  TREASURY_ADDRESS,
  USDC_DECIMALS,
  USDC_TOKEN_ID,
} from "@/config/network";
import { parseAmountToAtomic } from "@/lib/mx/format";
import type { AgentPaymentAsset } from "@/lib/agents/createSubscriptionPayment";

type MxOperation = {
  type?: string;
  sender?: string;
  receiver?: string;
  value?: string;
  identifier?: string;
  ticker?: string;
};

type MxTransaction = {
  txHash?: string;
  status?: string;
  sender?: string;
  receiver?: string;
  value?: string;
  data?: string;
  operations?: MxOperation[];
  action?: {
    arguments?: {
      transfers?: Array<{
        token?: string;
        value?: string;
      }>;
    };
  };
};

function sameAddress(a?: string, b?: string): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function expectedAtomic(
  asset: AgentPaymentAsset,
  agentId: string,
): bigint {
  const agent = getAgentById(agentId);
  if (asset === "USDC") {
    return parseAmountToAtomic(String(agentSubscriptionUsdc(agent)), USDC_DECIMALS);
  }
  return parseAmountToAtomic(
    String(agentSubscriptionNovaAmount(agent)),
    NOVA_DECIMALS,
  );
}

function expectedToken(asset: AgentPaymentAsset): string {
  return asset === "USDC" ? USDC_TOKEN_ID : NOVA_TOKEN_ID;
}

function decodeTxData(data?: string): string {
  if (!data) return "";
  try {
    return Buffer.from(data, "base64").toString("utf8");
  } catch {
    return data;
  }
}

function paidFromOperations(
  tx: MxTransaction,
  walletAddress: string,
  tokenId: string,
): bigint {
  let paid = BigInt(0);
  for (const op of tx.operations ?? []) {
    if (!sameAddress(op.receiver, TREASURY_ADDRESS)) continue;
    if (!sameAddress(op.sender, walletAddress)) continue;
    const id = op.identifier ?? op.ticker ?? "";
    if (id.toUpperCase() !== tokenId.toUpperCase()) continue;
    paid += BigInt(op.value ?? "0");
  }
  return paid;
}

function paidFromActionTransfers(tx: MxTransaction, tokenId: string): bigint {
  let paid = BigInt(0);
  for (const t of tx.action?.arguments?.transfers ?? []) {
    if ((t.token ?? "").toUpperCase() !== tokenId.toUpperCase()) continue;
    paid += BigInt(t.value ?? "0");
  }
  if (paid > BigInt(0) && !sameAddress(tx.receiver, TREASURY_ADDRESS)) {
    return BigInt(0);
  }
  return paid;
}

/** Fallback when indexer operations are still empty — decode ESDTTransfer@token@amount. */
function paidFromTxData(tx: MxTransaction, tokenId: string): bigint {
  const decoded = decodeTxData(tx.data);
  if (!decoded.startsWith("ESDTTransfer@")) return BigInt(0);
  if (!sameAddress(tx.receiver, TREASURY_ADDRESS)) return BigInt(0);
  const parts = decoded.split("@");
  const tokenHex = parts[1] ?? "";
  const amountHex = parts[2] ?? "0";
  let tokenFromData = "";
  try {
    tokenFromData = Buffer.from(tokenHex, "hex").toString("utf8");
  } catch {
    return BigInt(0);
  }
  if (tokenFromData.toUpperCase() !== tokenId.toUpperCase()) return BigInt(0);
  try {
    return BigInt(`0x${amountHex || "0"}`);
  } catch {
    return BigInt(0);
  }
}

async function fetchTransaction(hash: string): Promise<MxTransaction> {
  let res: Response;
  try {
    res = await fetch(
      `${API_URL}/transactions/${hash}?withOperations=true`,
      { cache: "no-store" },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    throw new Error(
      `MultiversX API unreachable while confirming payment (${detail})`,
    );
  }
  if (!res.ok) {
    throw new Error("Payment transaction not found yet — retry shortly");
  }
  return (await res.json()) as MxTransaction;
}

export async function verifyAgentSubscriptionPayment(params: {
  paymentTxHash: string;
  walletAddress: string;
  agentId: string;
  asset: AgentPaymentAsset;
}): Promise<{ amountAtomic: string; amountHuman: string }> {
  const agentId = resolveAgentId(params.agentId);
  if (!getAgentById(agentId)) {
    throw new Error("Unknown agent");
  }

  const hash = params.paymentTxHash.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
    throw new Error("Invalid payment transaction hash");
  }

  // Indexer lag: retry a few times before failing activation.
  let tx: MxTransaction | null = null;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      tx = await fetchTransaction(hash);
      if (tx.status === "success") break;
      if (tx.status === "fail" || tx.status === "invalid") {
        throw new Error(`Payment not confirmed (status: ${tx.status})`);
      }
      lastError = new Error(
        `Payment not confirmed (status: ${tx.status ?? "pending"})`,
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (
        lastError.message.includes("fail") ||
        lastError.message.includes("invalid")
      ) {
        throw lastError;
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!tx || tx.status !== "success") {
    throw lastError ?? new Error("Payment transaction not found yet — retry shortly");
  }

  if (!sameAddress(tx.sender, params.walletAddress)) {
    throw new Error("Payment sender does not match connected wallet");
  }

  const tokenId = expectedToken(params.asset);
  const need = expectedAtomic(params.asset, agentId);

  let paid = paidFromOperations(tx, params.walletAddress, tokenId);
  if (paid === BigInt(0)) {
    paid = paidFromActionTransfers(tx, tokenId);
  }
  if (paid === BigInt(0)) {
    paid = paidFromTxData(tx, tokenId);
  }

  if (paid < need) {
    throw new Error(
      `Insufficient payment (need ${need.toString()} atomic ${tokenId}, found ${paid.toString()})`,
    );
  }

  const agent = getAgentById(agentId);
  return {
    amountAtomic: paid.toString(),
    amountHuman:
      params.asset === "USDC"
        ? String(agentSubscriptionUsdc(agent))
        : String(agentSubscriptionNovaAmount(agent)),
  };
}
