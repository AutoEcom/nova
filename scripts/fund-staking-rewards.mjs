/**
 * Call fundRewards on the Evolgo staking SC — send $NOVA from treasury.
 *
 * Usage:
 *   node scripts/fund-staking-rewards.mjs
 *   node scripts/fund-staking-rewards.mjs --amount=10000
 *   node scripts/fund-staking-rewards.mjs --dry-run
 *
 * Env (.env.local):
 *   TREASURY_MNEMONIC / TREASURY_WALLET_PEM
 *   NEXT_PUBLIC_STAKING_CONTRACT (or contracts/.../output/deployed.json)
 *   NEXT_PUBLIC_TREASURY_ADDRESS (optional address check)
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  Account,
  Address,
  MainnetEntrypoint,
  SmartContractTransactionsFactory,
  Token,
  TokenTransfer,
  TransactionsFactoryConfig,
  UserSecretKey,
} = require("@multiversx/sdk-core");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEPLOYED_PATH = path.join(
  ROOT,
  "contracts",
  "evolgo-staking",
  "output",
  "deployed.json",
);

const CHAIN_ID = "1";
const API_URL = "https://api.multiversx.com";
const EXPLORER_URL = "https://explorer.multiversx.com";
const DEFAULT_TOKEN = "NOVA-04c5f5";
const NOVA_DECIMALS = 18;
/** Starter reward inventory — enough runway for early stakes without draining treasury. */
const DEFAULT_AMOUNT_NOVA = "100000";
const FUND_GAS = 12_000_000n;

const dryRun = process.argv.includes("--dry-run");

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadTreasuryAccount() {
  const pem = process.env.TREASURY_WALLET_PEM?.trim();
  const mnemonic = process.env.TREASURY_MNEMONIC?.trim();

  let account;
  if (pem) {
    const normalized = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
    account = new Account(UserSecretKey.fromPem(normalized));
  } else if (mnemonic) {
    account = Account.newFromMnemonic(mnemonic);
  } else {
    throw new Error(
      "Missing TREASURY_MNEMONIC (or TREASURY_WALLET_PEM) in .env.local",
    );
  }

  const expected = process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.trim();
  const address = account.address.toBech32();
  if (expected && address.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(
      `Signer ${address} does not match NEXT_PUBLIC_TREASURY_ADDRESS ${expected}`,
    );
  }
  return account;
}

function resolveContractAddress() {
  const fromEnv = process.env.NEXT_PUBLIC_STAKING_CONTRACT?.trim();
  if (fromEnv) return fromEnv;
  if (fs.existsSync(DEPLOYED_PATH)) {
    const meta = JSON.parse(fs.readFileSync(DEPLOYED_PATH, "utf8"));
    if (meta.contractAddress) return meta.contractAddress;
  }
  throw new Error(
    "Missing staking contract address. Set NEXT_PUBLIC_STAKING_CONTRACT or deploy first.",
  );
}

function parseAmountToAtomic(amount, decimals) {
  const trimmed = String(amount).trim();
  if (!trimmed || Number.isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
    throw new Error("Amount must be a positive number");
  }
  const [wholeRaw, fracRaw = ""] = trimmed.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole + frac);
}

async function fetchNovaBalance(address, tokenId) {
  const res = await fetch(`${API_URL}/accounts/${address}/tokens/${tokenId}`, {
    cache: "no-store",
  });
  if (!res.ok) return 0n;
  const json = await res.json();
  return BigInt(json.balance ?? "0");
}

async function main() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));

  const tokenId = (process.env.NOVA_TOKEN_ID || DEFAULT_TOKEN).trim();
  const amountHuman = argValue("amount") || process.env.FUND_AMOUNT_NOVA || DEFAULT_AMOUNT_NOVA;
  const amountAtomic = parseAmountToAtomic(amountHuman, NOVA_DECIMALS);
  const contractAddress = resolveContractAddress();
  const account = loadTreasuryAccount();
  const treasury = account.address.toBech32();

  console.log("Treasury:", treasury);
  console.log("Contract:", contractAddress);
  console.log("Token:   ", tokenId);
  console.log("Amount:  ", `${amountHuman} NOVA (${amountAtomic.toString()} atomic)`);
  console.log("Mode:    ", dryRun ? "DRY RUN" : "MAINNET BROADCAST");

  const balance = await fetchNovaBalance(treasury, tokenId);
  console.log("Balance: ", `${balance.toString()} atomic NOVA`);
  if (balance < amountAtomic) {
    throw new Error(
      `Treasury NOVA balance too low (need ${amountAtomic}, have ${balance})`,
    );
  }

  const factory = new SmartContractTransactionsFactory({
    config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
  });
  const nova = new Token({ identifier: tokenId });
  const transfer = new TokenTransfer({ token: nova, amount: amountAtomic });

  const tx = await factory.createTransactionForExecute(account.address, {
    contract: Address.newFromBech32(contractAddress),
    gasLimit: FUND_GAS,
    function: "fundRewards",
    arguments: [],
    tokenTransfers: [transfer],
  });

  if (dryRun) {
    console.log("\nDry run OK — fundRewards transaction built.");
    console.log("Gas limit:", tx.gasLimit.toString());
    console.log("Receiver: ", tx.receiver.toBech32());
    return;
  }

  const entrypoint = new MainnetEntrypoint({
    url: API_URL,
    kind: "api",
    clientName: "evolgo-fund-staking",
  });

  account.nonce = await entrypoint.recallAccountNonce(account.address);
  tx.nonce = account.getNonceThenIncrement();
  tx.signature = await account.signTransaction(tx);

  console.log("\nBroadcasting fundRewards…");
  const txHash = await entrypoint.sendTransaction(tx);
  console.log("Tx hash:", txHash);
  console.log("Explorer:", `${EXPLORER_URL}/transactions/${txHash}`);

  console.log("Waiting for confirmation…");
  const completed = await entrypoint.awaitCompletedTransaction(txHash);
  const status = completed.status?.toString?.() ?? completed.status;
  if (status && String(status).toLowerCase() !== "success") {
    throw new Error(`Transaction finished with status: ${status}`);
  }

  const resultPath = path.join(
    ROOT,
    "contracts",
    "evolgo-staking",
    "output",
    "funded.json",
  );
  fs.writeFileSync(
    resultPath,
    `${JSON.stringify(
      {
        network: "mainnet",
        contractAddress,
        tokenId,
        amountNova: amountHuman,
        amountAtomic: amountAtomic.toString(),
        txHash,
        fundedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("\nfundRewards confirmed.");
  console.log(`Saved → ${resultPath}`);
}

main().catch((err) => {
  console.error("\nFund failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
