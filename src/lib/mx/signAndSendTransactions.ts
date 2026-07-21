import type { Transaction } from "@multiversx/sdk-core";
import type { TransactionsDisplayInfoType } from "@multiversx/sdk-dapp/out/types/transactions.types";
import { getAccountProvider } from "@multiversx/sdk-dapp/out/providers/helpers/accountProvider";
import { TransactionManager } from "@multiversx/sdk-dapp/out/managers/TransactionManager";

type SignAndSendProps = {
  transactions: Transaction[];
  transactionsDisplayInfo?: TransactionsDisplayInfoType;
};

export async function signAndSendTransactions({
  transactions,
  transactionsDisplayInfo,
}: SignAndSendProps) {
  const provider = getAccountProvider();
  const txManager = TransactionManager.getInstance();

  const signedTransactions = await provider.signTransactions(transactions);
  const sentTransactions = await txManager.send(signedTransactions);
  const sessionId = await txManager.track(sentTransactions, {
    transactionsDisplayInfo,
  });

  return { sentTransactions, sessionId };
}
