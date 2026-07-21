import {
  Address,
  Token,
  TokenTransfer,
  TransferTransactionsFactory,
  TransactionsFactoryConfig,
} from "@multiversx/sdk-core";
import {
  CHAIN_ID,
  TREASURY_ADDRESS,
  USDC_TOKEN_ID,
} from "@/config/network";
import { parseAmountToAtomic } from "./format";

export type PaymentAsset = "EGLD" | "USDC";

type CreateBuyTxParams = {
  senderAddress: string;
  amount: string;
  asset: PaymentAsset;
  nonce: number;
};

export async function createBuyNovaTransaction({
  senderAddress,
  amount,
  asset,
  nonce,
}: CreateBuyTxParams) {
  const sender = Address.newFromBech32(senderAddress);
  const receiver = Address.newFromBech32(TREASURY_ADDRESS);
  const factory = new TransferTransactionsFactory({
    config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
  });

  if (asset === "EGLD") {
    const nativeAmount = parseAmountToAtomic(amount, 18);
    const tx = await factory.createTransactionForNativeTokenTransfer(sender, {
      receiver,
      nativeAmount,
      data: new TextEncoder().encode("BUYNOVA"),
    });
    tx.nonce = BigInt(nonce);
    return tx;
  }

  const usdcAmount = parseAmountToAtomic(amount, 6);
  const usdc = new Token({ identifier: USDC_TOKEN_ID });
  const transfer = new TokenTransfer({ token: usdc, amount: usdcAmount });
  const tx = await factory.createTransactionForESDTTokenTransfer(sender, {
    receiver,
    tokenTransfers: [transfer],
  });
  tx.nonce = BigInt(nonce);
  return tx;
}
