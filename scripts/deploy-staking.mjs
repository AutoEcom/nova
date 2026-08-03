/**
 * Deploy Evolgo staking SC to MultiversX Mainnet using TREASURY_MNEMONIC
 * (or TREASURY_WALLET_PEM) — no local .pem file required.
 *
 * Usage:
 *   node scripts/deploy-staking.mjs
 *   node scripts/deploy-staking.mjs --dry-run
 *
 * Env (from process env or .env.local):
 *   TREASURY_MNEMONIC          — preferred
 *   TREASURY_WALLET_PEM        — alternative
 *   NEXT_PUBLIC_TREASURY_ADDRESS — must match derived signer (optional check)
 *   NOVA_TOKEN_ID              — default NOVA-04c5f5
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  Account,
  Abi,
  MainnetEntrypoint,
  SmartContractTransactionsFactory,
  SmartContractTransactionsOutcomeParser,
  TokenIdentifierValue,
  TransactionsFactoryConfig,
  UserSecretKey,
} = require("@multiversx/sdk-core");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "contracts", "evolgo-staking", "output");
const WASM_PATH = path.join(OUTPUT_DIR, "evolgo-staking.wasm");
const ABI_PATH = path.join(OUTPUT_DIR, "evolgo-staking.abi.json");
const DEPLOYED_PATH = path.join(OUTPUT_DIR, "deployed.json");

const CHAIN_ID = "1";
const API_URL = "https://api.multiversx.com";
const EXPLORER_URL = "https://explorer.multiversx.com";
const DEFAULT_TOKEN = "NOVA-04c5f5";
const DEPLOY_GAS = 60_000_000n;

const dryRun = process.argv.includes("--dry-run");

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
      "Missing TREASURY_MNEMONIC (or TREASURY_WALLET_PEM). Set it in .env.local or the shell.",
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

async function main() {
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, ".env"));

  if (!fs.existsSync(WASM_PATH)) {
    throw new Error(
      `Missing ${WASM_PATH}. Build first:\n  cd contracts/evolgo-staking/meta && cargo run -- build`,
    );
  }
  if (!fs.existsSync(ABI_PATH)) {
    throw new Error(`Missing ${ABI_PATH}`);
  }

  const tokenId = (process.env.NOVA_TOKEN_ID || DEFAULT_TOKEN).trim();
  const bytecode = fs.readFileSync(WASM_PATH);
  const abiJson = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
  const abi = Abi.create(abiJson);

  const account = loadTreasuryAccount();
  const deployer = account.address.toBech32();

  console.log("Deployer:", deployer);
  console.log("Token:   ", tokenId);
  console.log("Wasm:    ", WASM_PATH, `(${bytecode.length} bytes)`);
  console.log("Mode:    ", dryRun ? "DRY RUN (no broadcast)" : "MAINNET BROADCAST");

  const factory = new SmartContractTransactionsFactory({
    config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
    abi,
  });

  const tx = await factory.createTransactionForDeploy(account.address, {
    bytecode,
    gasLimit: DEPLOY_GAS,
    arguments: [TokenIdentifierValue.esdtTokenIdentifier(tokenId)],
    isUpgradeable: true,
    isReadable: true,
    // Required so stake() can receive ESDT payments.
    isPayable: true,
    isPayableBySmartContract: true,
  });

  if (dryRun) {
    console.log("\nDry run OK — deploy transaction built.");
    console.log("Gas limit:", tx.gasLimit.toString());
    console.log("Receiver: ", tx.receiver.toBech32());
    console.log("Data len: ", (tx.data?.length ?? 0).toString());
    return;
  }

  const entrypoint = new MainnetEntrypoint({
    url: API_URL,
    kind: "api",
  });

  account.nonce = await entrypoint.recallAccountNonce(account.address);
  tx.nonce = account.getNonceThenIncrement();
  tx.signature = await account.signTransaction(tx);

  console.log("\nBroadcasting deploy…");
  const txHash = await entrypoint.sendTransaction(tx);
  console.log("Tx hash:", txHash);
  console.log("Explorer:", `${EXPLORER_URL}/transactions/${txHash}`);

  console.log("Waiting for confirmation…");
  const completed = await entrypoint.awaitCompletedTransaction(txHash);
  const parser = new SmartContractTransactionsOutcomeParser();
  const outcome = parser.parseDeploy({ transactionOnNetwork: completed });

  if (!outcome.contracts?.length) {
    throw new Error(
      `Deploy finished but no contract address was parsed (returnCode=${outcome.returnCode}, message=${outcome.returnMessage})`,
    );
  }

  const contract = outcome.contracts[0].address.toBech32();
  const result = {
    network: "mainnet",
    chainId: CHAIN_ID,
    deployer,
    stakingToken: tokenId,
    contractAddress: contract,
    txHash,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(DEPLOYED_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log("\nDeployed staking contract:");
  console.log("  ", contract);
  console.log("\nNext steps:");
  console.log(`  1. Set NEXT_PUBLIC_STAKING_CONTRACT=${contract}`);
  console.log("     in .env.local and Vercel Environment Variables");
  console.log("  2. As owner, call fundRewards with $NOVA inventory");
  console.log(`  3. Saved metadata → ${DEPLOYED_PATH}`);
}

main().catch((err) => {
  console.error("\nDeploy failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
