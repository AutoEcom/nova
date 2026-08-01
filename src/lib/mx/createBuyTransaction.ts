import {
  Address,
  Token,
  TokenTransfer,
  TransferTransactionsFactory,
  TransactionsFactoryConfig,
} from "@multiversx/sdk-core";
import {
  CHAIN_ID,
  EGLD_DECIMALS,
  MIN_PURCHASE_USDC,
  TREASURY_ADDRESS,
  USDC_DECIMALS,
  USDC_TOKEN_ID,
} from "@/config/network";
import { parseAmountToAtomic } from "./format";
import type { PaymentAsset } from "./pricing";

export type { PaymentAsset };

type CreateBuyTxParams = {
  senderAddress: string;
  amount: string;
  asset: PaymentAsset;
  /** USDC-equivalent value of the payment, used to enforce the sale minimum. */
  usdcValue: number;
  nonce: number;
};

/**
 * Builds the *payment* leg of a $NOVA purchase (buyer → treasury).
 *
 * - EGLD  -> native transfer with a `buy-nova` memo tag.
 * - USDC  -> standard ESDTTransfer (MultiversX ESDT standard).
 *
 * $NOVA delivery is NOT performed here — wallets cannot spend treasury funds
 * from the browser. After this payment confirms on-chain, `/api/nova/fulfill`
 * verifies the payment and sends NOVA-04c5f5 from the treasury signer.
 *
 * The minimum-purchase rule is enforced here as a defense-in-depth guard, so a
 * transaction can never be constructed below the sale floor even if the UI
 * validation is bypassed.
 */
export async function createBuyNovaTransaction({
  senderAddress,
  amount,
  asset,
  usdcValue,
  nonce,
}: CreateBuyTxParams) {
  if (!Number.isFinite(usdcValue) || usdcValue + 1e-9 < MIN_PURCHASE_USDC) {
    throw new Error(`Minimum purchase is ${MIN_PURCHASE_USDC} USDC`);
  }

  const sender = Address.newFromBech32(senderAddress);
  const receiver = Address.newFromBech32(TREASURY_ADDRESS);
  const factory = new TransferTransactionsFactory({
    config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
  });

  if (asset === "EGLD") {
    const nativeAmount = parseAmountToAtomic(amount, EGLD_DECIMALS);
    const tx = await factory.createTransactionForNativeTokenTransfer(sender, {
      receiver,
      nativeAmount,
      data: new TextEncoder().encode("buy-nova"),
    });
    tx.nonce = BigInt(nonce);
    return tx;
  }

  const usdcAmount = parseAmountToAtomic(amount, USDC_DECIMALS);
  const usdc = new Token({ identifier: USDC_TOKEN_ID });
  const transfer = new TokenTransfer({ token: usdc, amount: usdcAmount });
  const tx = await factory.createTransactionForESDTTokenTransfer(sender, {
    receiver,
    tokenTransfers: [transfer],
  });
  tx.nonce = BigInt(nonce);
  return tx;
}
