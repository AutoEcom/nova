import { Address } from "@multiversx/sdk-core";
import { GATEWAY_URL, NOVA_DECIMALS } from "@/config/network";
import {
  STAKING_CONTRACT_ADDRESS,
  STAKING_POOL_ONCHAIN_ID,
  type StakingPoolId,
  isStakingContractConfigured,
} from "@/config/staking";
import { formatTokenAmount } from "@/lib/mx/format";

export type OnChainStakePosition = {
  positionId: number;
  poolId: StakingPoolId;
  poolOnChainId: number;
  amountAtomic: string;
  amountNova: number;
  stakeTimestamp: number;
  lastClaimTimestamp: number;
  unlockTimestamp: number;
  pendingRewardsAtomic: string;
  pendingRewardsNova: number;
};

type VmQueryResponse = {
  data?: {
    data?: {
      returnData?: string[];
      returnCode?: string;
      returnMessage?: string;
    };
  };
  error?: string;
  code?: string;
};

const POOL_BY_ONCHAIN: Record<number, StakingPoolId> = {
  [STAKING_POOL_ONCHAIN_ID.flexible]: "flexible",
  [STAKING_POOL_ONCHAIN_ID.locked30]: "locked30",
  [STAKING_POOL_ONCHAIN_ID.locked90]: "locked90",
};

function addressArgHex(bech32: string): string {
  return Address.newFromBech32(bech32).toHex();
}

function topEncodeUintHex(value: number | bigint): string {
  const n = BigInt(value);
  if (n === BigInt(0)) return "00";
  let hex = n.toString(16);
  if (hex.length % 2 === 1) hex = `0${hex}`;
  return hex;
}

function b64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function readU64BE(bytes: Uint8Array, offset: number): bigint {
  let value = BigInt(0);
  for (let i = 0; i < 8; i += 1) {
    value = (value << BigInt(8)) | BigInt(bytes[offset + i] ?? 0);
  }
  return value;
}

function readU32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  );
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  if (bytes.length === 0) return BigInt(0);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return BigInt(`0x${hex}`);
}

function atomicToNova(atomic: bigint): number {
  return Number(formatTokenAmount(atomic, NOVA_DECIMALS, 8));
}

/** Decode Top/Nested-encoded StakePosition from contract return bytes. */
export function decodeStakePosition(bytes: Uint8Array): {
  positionId: number;
  poolOnChainId: number;
  amountAtomic: bigint;
  stakeTimestamp: number;
  lastClaimTimestamp: number;
  unlockTimestamp: number;
} {
  let o = 0;
  const positionId = Number(readU64BE(bytes, o));
  o += 8;
  const poolOnChainId = bytes[o] ?? 0;
  o += 1;
  const amountLen = readU32BE(bytes, o);
  o += 4;
  const amountAtomic = bytesToBigInt(bytes.subarray(o, o + amountLen));
  o += amountLen;
  const stakeTimestamp = Number(readU64BE(bytes, o));
  o += 8;
  const lastClaimTimestamp = Number(readU64BE(bytes, o));
  o += 8;
  const unlockTimestamp = Number(readU64BE(bytes, o));
  return {
    positionId,
    poolOnChainId,
    amountAtomic,
    stakeTimestamp,
    lastClaimTimestamp,
    unlockTimestamp,
  };
}

async function vmQuery(funcName: string, args: string[] = []): Promise<Uint8Array[]> {
  if (!isStakingContractConfigured()) {
    throw new Error("Staking contract not configured");
  }

  const res = await fetch(`${GATEWAY_URL}/vm-values/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scAddress: STAKING_CONTRACT_ADDRESS,
      funcName,
      args,
    }),
    cache: "no-store",
  });

  const json = (await res.json()) as VmQueryResponse;
  if (!res.ok || json.error) {
    throw new Error(json.error || json.data?.data?.returnMessage || "VM query failed");
  }

  const returnCode = json.data?.data?.returnCode ?? "";
  if (returnCode && returnCode !== "ok") {
    throw new Error(json.data?.data?.returnMessage || `VM return code: ${returnCode}`);
  }

  return (json.data?.data?.returnData ?? []).map((part) => b64ToBytes(part));
}

export async function queryIsSyndicateEligible(wallet: string): Promise<boolean> {
  const parts = await vmQuery("isSyndicateEligible", [addressArgHex(wallet)]);
  const first = parts[0];
  if (!first || first.length === 0) return false;
  return first.some((b) => b !== 0);
}

export async function querySyndicateStakedAtomic(wallet: string): Promise<bigint> {
  const parts = await vmQuery("getSyndicateStaked", [addressArgHex(wallet)]);
  const first = parts[0];
  if (!first) return BigInt(0);
  return bytesToBigInt(first);
}

export async function queryPendingRewardsAtomic(positionId: number): Promise<bigint> {
  const parts = await vmQuery("getPendingRewards", [topEncodeUintHex(positionId)]);
  const first = parts[0];
  if (!first) return BigInt(0);
  return bytesToBigInt(first);
}

export async function queryUserPositions(
  wallet: string,
): Promise<OnChainStakePosition[]> {
  const parts = await vmQuery("getUserPositions", [addressArgHex(wallet)]);
  const positions: OnChainStakePosition[] = [];

  for (const part of parts) {
    if (!part.length) continue;
    try {
      const decoded = decodeStakePosition(part);
      const poolId = POOL_BY_ONCHAIN[decoded.poolOnChainId];
      if (!poolId) continue;
      let pending = BigInt(0);
      try {
        pending = await queryPendingRewardsAtomic(decoded.positionId);
      } catch {
        pending = BigInt(0);
      }
      positions.push({
        positionId: decoded.positionId,
        poolId,
        poolOnChainId: decoded.poolOnChainId,
        amountAtomic: decoded.amountAtomic.toString(),
        amountNova: atomicToNova(decoded.amountAtomic),
        stakeTimestamp: decoded.stakeTimestamp,
        lastClaimTimestamp: decoded.lastClaimTimestamp,
        unlockTimestamp: decoded.unlockTimestamp,
        pendingRewardsAtomic: pending.toString(),
        pendingRewardsNova: atomicToNova(pending),
      });
    } catch {
      // skip malformed parts
    }
  }

  return positions.sort((a, b) => a.positionId - b.positionId);
}
