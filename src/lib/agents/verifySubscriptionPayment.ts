import {
  AGENT_SUBSCRIPTION_USDC,
  agentSubscriptionNovaAmount,
  getAgentById,
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

function expectedAtomic(asset: AgentPaymentAsset): bigint {
  if (asset === "USDC") {
    return parseAmountToAtomic(String(AGENT_SUBSCRIPTION_USDC), USDC_DECIMALS);
  }
  return parseAmountToAtomic(String(agentSubscriptionNovaAmount()), NOVA_DECIMALS);
}

function expectedToken(asset: AgentPaymentAsset): string {
  return asset === "USDC" ? USDC_TOKEN_ID : NOVA_TOKEN_ID;
}

export async function verifyAgentSubscriptionPayment(params: {
  paymentTxHash: string;
  walletAddress: string;
  agentId: string;
  asset: AgentPaymentAsset;
}): Promise<{ amountAtomic: string; amountHuman: string }> {
  if (!getAgentById(params.agentId)) {
    throw new Error("Unknown agent");
  }

  const hash = params.paymentTxHash.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
    throw new Error("Invalid payment transaction hash");
  }

  const res = await fetch(`${API_URL}/transactions/${hash}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Payment transaction not found yet — retry shortly");
  }

  const tx = (await res.json()) as MxTransaction;
  if (tx.status !== "success") {
    throw new Error(`Payment not confirmed (status: ${tx.status ?? "unknown"})`);
  }
  if (!sameAddress(tx.sender, params.walletAddress)) {
    throw new Error("Payment sender does not match connected wallet");
  }

  const tokenId = expectedToken(params.asset);
  const need = expectedAtomic(params.asset);
  let paid = BigInt(0);

  for (const op of tx.operations ?? []) {
    if (!sameAddress(op.receiver, TREASURY_ADDRESS)) continue;
    if (!sameAddress(op.sender, params.walletAddress)) continue;
    const id = op.identifier ?? op.ticker ?? "";
    if (id.toUpperCase() !== tokenId.toUpperCase()) continue;
    paid += BigInt(op.value ?? "0");
  }

  // Fallback: action.transfers on some API shapes
  if (paid === BigInt(0)) {
    for (const t of tx.action?.arguments?.transfers ?? []) {
      if ((t.token ?? "").toUpperCase() !== tokenId.toUpperCase()) continue;
      paid += BigInt(t.value ?? "0");
    }
    if (paid > BigInt(0) && !sameAddress(tx.receiver, TREASURY_ADDRESS)) {
      // ESDT to treasury usually has receiver = treasury
      if (!sameAddress(tx.receiver, TREASURY_ADDRESS)) {
        paid = BigInt(0);
      }
    }
  }

  if (paid < need) {
    throw new Error(
      `Insufficient payment (need ${need.toString()} atomic ${tokenId}, found ${paid.toString()})`,
    );
  }

  return {
    amountAtomic: paid.toString(),
    amountHuman:
      params.asset === "USDC"
        ? String(AGENT_SUBSCRIPTION_USDC)
        : String(agentSubscriptionNovaAmount()),
  };
}
