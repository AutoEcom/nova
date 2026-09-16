import {
  Address,
  Token,
  TokenTransfer,
  TransferTransactionsFactory,
  TransactionsFactoryConfig,
} from "@multiversx/sdk-core";
import {
  agentSubscriptionNovaAmount,
  agentSubscriptionUsdc,
  getAgentById,
} from "@/config/agents";
import {
  CHAIN_ID,
  NOVA_DECIMALS,
  NOVA_TOKEN_ID,
  TREASURY_ADDRESS,
  USDC_DECIMALS,
  USDC_TOKEN_ID,
} from "@/config/network";
import { parseAmountToAtomic } from "@/lib/mx/format";

export type AgentPaymentAsset = "USDC" | "NOVA";

export async function createAgentSubscriptionPayment(params: {
  senderAddress: string;
  agentId: string;
  asset: AgentPaymentAsset;
  nonce: number;
}) {
  const agent = getAgentById(params.agentId);
  const sender = Address.newFromBech32(params.senderAddress);
  const receiver = Address.newFromBech32(TREASURY_ADDRESS);
  const factory = new TransferTransactionsFactory({
    config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
  });

  if (params.asset === "USDC") {
    const usdcHuman = String(agentSubscriptionUsdc(agent));
    const amount = parseAmountToAtomic(usdcHuman, USDC_DECIMALS);
    const usdc = new Token({ identifier: USDC_TOKEN_ID });
    const transfer = new TokenTransfer({ token: usdc, amount });
    const tx = await factory.createTransactionForESDTTokenTransfer(sender, {
      receiver,
      tokenTransfers: [transfer],
    });
    // Verification uses amount + token + receiver (treasury).
    if (tx.gasLimit < BigInt(500_000)) tx.gasLimit = BigInt(500_000);
    tx.nonce = BigInt(params.nonce);
    return {
      tx,
      amountAtomic: amount.toString(),
      amountHuman: usdcHuman,
    };
  }

  const novaHuman = String(agentSubscriptionNovaAmount(agent));
  const amount = parseAmountToAtomic(novaHuman, NOVA_DECIMALS);
  const nova = new Token({ identifier: NOVA_TOKEN_ID });
  const transfer = new TokenTransfer({ token: nova, amount });
  const tx = await factory.createTransactionForESDTTokenTransfer(sender, {
    receiver,
    tokenTransfers: [transfer],
  });
  if (tx.gasLimit < BigInt(500_000)) tx.gasLimit = BigInt(500_000);
  tx.nonce = BigInt(params.nonce);
  return { tx, amountAtomic: amount.toString(), amountHuman: novaHuman };
}
