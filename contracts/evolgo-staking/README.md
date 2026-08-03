# Evolgo Staking Smart Contract (MultiversX / Rust)

On-chain staking for **$NOVA** with three pools:

| Pool ID | Name | Lock | APY (bps) | Notes |
|--------:|------|------|-----------|--------|
| `0` | Flexible | None | 600 (6%) | Instant unstake |
| `1` | 30-Days Operator | 30 days | 1800 (18%) | Standard lock |
| `2` | 90-Days Syndicate | 90 days | 4200 (42%) | Min **10,000 $NOVA**; unlocks referral Syndicate tier |

## Endpoints

- `stake(pool_id)` — payable ESDT (`NOVA-04c5f5`)
- `unstake(position_id)` — returns principal + pending rewards after unlock
- `claimRewards(position_id)` — rewards only
- `fundRewards()` — owner tops up reward inventory
- Views: `getPosition`, `getUserPositionIds`, `getUserPositions`, `getSyndicateStaked`, `isSyndicateEligible`, `getPendingRewards`

## Prerequisites

1. Install Rust (`rustup`) and the MultiversX WASM target toolchain.
2. Install `sc-meta`:

```bash
cargo install multiversx-sc-meta --locked
```

Or use the contract-local meta crate (recommended):

```bash
cd contracts/evolgo-staking/meta
cargo run -- abi
cargo run -- build
```

## Build

```bash
cd contracts/evolgo-staking/meta
cargo run -- build
```

Artifacts land in `contracts/evolgo-staking/output/` (`evolgo-staking.wasm`, `.abi.json`).

## Deploy (devnet / mainnet)

```bash
# Example with mxpy / sc-meta deploy — replace wallet & token id
mxpy contract deploy \
  --bytecode=../output/evolgo-staking.wasm \
  --pem=wallet.pem \
  --proxy=https://gateway.multiversx.com \
  --chain=1 \
  --arguments str:NOVA-04c5f5 \
  --gas-limit=60000000
```

After deploy, set in `.env.local` / Vercel:

```bash
NEXT_PUBLIC_STAKING_CONTRACT=erd1...
```

Fund the contract with reward inventory (`fundRewards` as owner) so claims succeed.

## Frontend / backend wiring

| Piece | Path |
|-------|------|
| Tx builders | `src/lib/staking/transactions.ts` |
| VM queries | `src/lib/staking/query.ts` |
| UI | `src/components/dashboard/StakingProgram.tsx` |
| Syndicate → referral tier | `POST /api/staking/syndicate` (+ auto-sync in `/api/referrals/me`) |

When `NEXT_PUBLIC_STAKING_CONTRACT` is unset, the staking UI stays in local mock mode.

### Post-deploy checklist

1. Deploy with init arg `str:NOVA-04c5f5` (or your token id).
2. Set `NEXT_PUBLIC_STAKING_CONTRACT=erd1…` in `.env.local`.
3. As owner, call `fundRewards` with enough $NOVA for APY payouts.
4. Stake ≥10,000 NOVA into pool `2` → backend should set referral tier to **Syndicate**.
