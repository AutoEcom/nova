import {
  Address,
  SmartContractTransactionsFactory,
  Token,
  TokenTransfer,
  TransactionsFactoryConfig,
} from "@multiversx/sdk-core";
import {
  CHAIN_ID,
  NOVA_DECIMALS,
  NOVA_TOKEN_ID,
} from "@/config/network";
import {
  STAKING_CONTRACT_ADDRESS,
  STAKING_POOL_ONCHAIN_ID,
  type StakingPoolId,
  isStakingContractConfigured,
} from "@/config/staking";
import { parseAmountToAtomic } from "@/lib/mx/format";

const STAKE_GAS = BigInt(12_000_000);
const UNSTAKE_GAS = BigInt(12_000_000);
const CLAIM_GAS = BigInt(10_000_000);

function requireContract(): string {
  if (!isStakingContractConfigured()) {
    throw new Error(
      "Staking contract not configured. Set NEXT_PUBLIC_STAKING_CONTRACT after deploy.",
    );
  }
  return STAKING_CONTRACT_ADDRESS;
}

function factory() {
  return new SmartContractTransactionsFactory({
    config: new TransactionsFactoryConfig({ chainID: CHAIN_ID }),
  });
}

/** Top-encode unsigned integer (shortest big-endian, zero → 0x00). */
function topEncodeUint(value: number | bigint): Uint8Array {
  const n = BigInt(value);
  if (n < BigInt(0)) throw new Error("Negative values are not supported");
  if (n === BigInt(0)) return new Uint8Array([0]);
  let hex = n.toString(16);
  if (hex.length % 2 === 1) hex = `0${hex}`;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function createStakeTransaction(params: {
  senderAddress: string;
  poolId: StakingPoolId;
  amount: string;
  nonce: number;
}) {
  const contract = requireContract();
  const poolOnChain = STAKING_POOL_ONCHAIN_ID[params.poolId];
  const amountAtomic = parseAmountToAtomic(params.amount, NOVA_DECIMALS);
  const nova = new Token({ identifier: NOVA_TOKEN_ID });
  const transfer = new TokenTransfer({ token: nova, amount: amountAtomic });

  const tx = await factory().createTransactionForExecute(
    Address.newFromBech32(params.senderAddress),
    {
      contract: Address.newFromBech32(contract),
      gasLimit: STAKE_GAS,
      function: "stake",
      arguments: [topEncodeUint(poolOnChain)],
      tokenTransfers: [transfer],
    },
  );
  tx.nonce = BigInt(params.nonce);
  return tx;
}

export async function createUnstakeTransaction(params: {
  senderAddress: string;
  positionId: number | bigint;
  nonce: number;
}) {
  const contract = requireContract();
  const tx = await factory().createTransactionForExecute(
    Address.newFromBech32(params.senderAddress),
    {
      contract: Address.newFromBech32(contract),
      gasLimit: UNSTAKE_GAS,
      function: "unstake",
      arguments: [topEncodeUint(params.positionId)],
    },
  );
  tx.nonce = BigInt(params.nonce);
  return tx;
}

export async function createClaimRewardsTransaction(params: {
  senderAddress: string;
  positionId: number | bigint;
  nonce: number;
}) {
  const contract = requireContract();
  const tx = await factory().createTransactionForExecute(
    Address.newFromBech32(params.senderAddress),
    {
      contract: Address.newFromBech32(contract),
      gasLimit: CLAIM_GAS,
      function: "claimRewards",
      arguments: [topEncodeUint(params.positionId)],
    },
  );
  tx.nonce = BigInt(params.nonce);
  return tx;
}
