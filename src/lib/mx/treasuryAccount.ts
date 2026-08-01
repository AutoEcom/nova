import { Account, UserSecretKey } from "@multiversx/sdk-core";
import { TREASURY_ADDRESS } from "@/config/network";

/**
 * Loads the treasury signing account from server-only secrets.
 *
 * Prefer `TREASURY_WALLET_PEM` (full PEM text; use `\n` for newlines in env).
 * Fallback: `TREASURY_MNEMONIC` (12/24 words for the treasury wallet).
 *
 * NEVER expose these via NEXT_PUBLIC_*.
 */
export function loadTreasuryAccount(): Account {
  const pem = process.env.TREASURY_WALLET_PEM?.trim();
  const mnemonic = process.env.TREASURY_MNEMONIC?.trim();

  let account: Account;
  if (pem) {
    const normalized = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
    account = new Account(UserSecretKey.fromPem(normalized));
  } else if (mnemonic) {
    account = Account.newFromMnemonic(mnemonic);
  } else {
    throw new Error(
      "Treasury signer missing. Set TREASURY_WALLET_PEM or TREASURY_MNEMONIC in server env.",
    );
  }

  const address = account.address.toBech32();
  if (address !== TREASURY_ADDRESS) {
    throw new Error(
      `Treasury signer address (${address}) does not match NEXT_PUBLIC_TREASURY_ADDRESS (${TREASURY_ADDRESS}).`,
    );
  }

  return account;
}

export function isTreasurySignerConfigured(): boolean {
  return Boolean(
    process.env.TREASURY_WALLET_PEM?.trim() ||
      process.env.TREASURY_MNEMONIC?.trim(),
  );
}
