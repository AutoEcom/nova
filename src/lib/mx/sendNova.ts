import {
  Address,
  MainnetEntrypoint,
  Token,
  TokenTransfer,
  TransferTransactionsFactory,
  TransactionsFactoryConfig,
  type Account,
} from "@multiversx/sdk-core";
import {
  API_URL,
  CHAIN_ID,
  NOVA_TOKEN_ID,
} from "@/config/network";

const CONFIRM_ATTEMPTS = 40;
const CONFIRM_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createEntrypoint() {
  return new MainnetEntrypoint({
    url: API_URL,
    kind: "api",
  });
}

async function waitForTxSuccess(txHash: string): Promise<void> {
  let lastStatus = "unknown";
  for (let i = 0; i < CONFIRM_ATTEMPTS; i++) {
    try {
      const res = await fetch(`${API_URL}/transactions/${txHash}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const tx = (await res.json()) as { status?: string };
        lastStatus = tx.status ?? lastStatus;
        if (tx.status === "success") return;
        if (tx.status === "fail" || tx.status === "invalid") {
          throw new Error(
            `NOVA transfer ${txHash} failed on-chain (${tx.status})`,
          );
        }
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("failed on-chain")
      ) {
        throw err;
      }
    }
    await sleep(CONFIRM_MS);
  }
  throw new Error(
    `Timed out confirming NOVA transfer ${txHash} (last status: ${lastStatus})`,
  );
}

/**
 * Sign + broadcast an ESDT NOVA transfer from the treasury account.
 * Tracks nonce on the Account object so follow-up txs never reuse a stale
 * network nonce (a common cause of silent drops right after another send).
 */
export async function sendNovaFromTreasury(
  treasury: Account,
  receiverBech32: string,
  novaAtomic: bigint,
  options?: { confirm?: boolean },
): Promise<string> {
  if (novaAtomic <= BigInt(0)) {
    throw new Error("NOVA transfer amount must be positive");
  }

  const entrypoint = createEntrypoint();
  // Refresh once, then keep a local nonce cursor for this Account instance.
  treasury.nonce = await entrypoint.recallAccountNonce(treasury.address);

  const factory = new TransferTransactionsFactory({
    config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
  });
  const nova = new Token({ identifier: NOVA_TOKEN_ID });
  const transfer = new TokenTransfer({ token: nova, amount: novaAtomic });
  const tx = await factory.createTransactionForESDTTokenTransfer(
    treasury.address,
    {
      receiver: Address.newFromBech32(receiverBech32),
      tokenTransfers: [transfer],
    },
  );

  // Ensure enough gas for ESDTTransfer (factory usually sets this; enforce floor).
  if (tx.gasLimit < BigInt(500_000)) {
    tx.gasLimit = BigInt(500_000);
  }

  tx.nonce = treasury.getNonceThenIncrement();
  tx.signature = await treasury.signTransaction(tx);

  console.info("[NOVA] Broadcasting ESDT transfer", {
    receiver: receiverBech32,
    amountAtomic: novaAtomic.toString(),
    nonce: tx.nonce.toString(),
  });

  const txHash = await entrypoint.sendTransaction(tx);
  if (!txHash || typeof txHash !== "string") {
    throw new Error("Treasury broadcast returned an empty transaction hash");
  }

  if (options?.confirm !== false) {
    await waitForTxSuccess(txHash);
  }

  console.info("[NOVA] ESDT transfer confirmed", { txHash });
  return txHash;
}

export async function sendTreasuryMemoReceipt(
  treasury: Account,
  memo: string,
): Promise<string | null> {
  try {
    const entrypoint = createEntrypoint();
    // Prefer continuing the local nonce cursor when present.
    if (treasury.nonce === undefined || treasury.nonce === null) {
      treasury.nonce = await entrypoint.recallAccountNonce(treasury.address);
    }

    const factory = new TransferTransactionsFactory({
      config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
    });
    const receiptTx = await factory.createTransactionForNativeTokenTransfer(
      treasury.address,
      {
        receiver: treasury.address,
        nativeAmount: BigInt(0),
        data: new TextEncoder().encode(memo),
      },
    );
    if (receiptTx.gasLimit < BigInt(50_000)) {
      receiptTx.gasLimit = BigInt(50_000);
    }
    receiptTx.nonce = treasury.getNonceThenIncrement();
    receiptTx.signature = await treasury.signTransaction(receiptTx);
    return await entrypoint.sendTransaction(receiptTx);
  } catch (err) {
    console.warn("[NOVA] Receipt memo tx failed", err);
    return null;
  }
}
