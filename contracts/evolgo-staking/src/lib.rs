#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Pool identifiers — must match frontend `STAKING_POOL_ONCHAIN_ID`.
pub const POOL_FLEXIBLE: u8 = 0;
pub const POOL_LOCKED_30: u8 = 1;
pub const POOL_LOCKED_90: u8 = 2;

/// APY in basis points (6% = 600).
pub const APY_FLEXIBLE_BPS: u64 = 600;
pub const APY_LOCKED_30_BPS: u64 = 1_800;
pub const APY_LOCKED_90_BPS: u64 = 4_200;

pub const SECONDS_PER_DAY: u64 = 86_400;
pub const LOCK_30_SECONDS: u64 = 30 * SECONDS_PER_DAY;
pub const LOCK_90_SECONDS: u64 = 90 * SECONDS_PER_DAY;

/// 10_000 NOVA with 18 decimals.
pub const SYNDICATE_MIN_STAKE: u64 = 10_000;
pub const TOKEN_DECIMALS: u32 = 18;

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct StakePosition<M: ManagedTypeApi> {
    pub position_id: u64,
    pub pool_id: u8,
    pub amount: BigUint<M>,
    pub stake_timestamp: u64,
    pub last_claim_timestamp: u64,
    pub unlock_timestamp: u64,
}

#[multiversx_sc::contract]
pub trait EvolgoStaking {
    #[init]
    fn init(&self, staking_token: TokenIdentifier) {
        require!(
            staking_token.is_valid_esdt_identifier(),
            "Invalid staking token"
        );
        self.staking_token().set(&staking_token);
        self.next_position_id().set(1u64);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // ------------------------------------------------------------------
    // Endpoints
    // ------------------------------------------------------------------

    /// Stake $NOVA into a pool. Payment must be the configured ESDT.
    /// `pool_id`: 0 = Flexible, 1 = 30-day Operator, 2 = 90-day Syndicate.
    #[payable("*")]
    #[endpoint(stake)]
    fn stake(&self, pool_id: u8) {
        self.require_valid_pool(pool_id);
        let payment = self.call_value().single_esdt();
        let staking_token = self.staking_token().get();
        require!(
            payment.token_identifier == staking_token,
            "Only the configured $NOVA token can be staked"
        );
        require!(payment.amount > 0, "Stake amount must be > 0");

        if pool_id == POOL_LOCKED_90 {
            let min = self.syndicate_min_amount();
            require!(
                payment.amount >= min,
                "Syndicate pool requires at least 10,000 $NOVA"
            );
        }

        let caller = self.blockchain().get_caller();
        let now = self.blockchain().get_block_timestamp();
        let unlock = self.unlock_timestamp_for_pool(pool_id, now);
        let position_id = self.next_position_id().get();

        let position = StakePosition {
            position_id,
            pool_id,
            amount: payment.amount.clone(),
            stake_timestamp: now,
            last_claim_timestamp: now,
            unlock_timestamp: unlock,
        };

        self.positions(position_id).set(&position);
        self.user_position_ids(&caller).insert(position_id);
        self.next_position_id().set(position_id + 1);

        if pool_id == POOL_LOCKED_90 {
            self.syndicate_staked(&caller)
                .update(|v| *v += payment.amount.clone());
        }

        self.total_staked_in_pool(pool_id)
            .update(|v| *v += payment.amount.clone());
    }

    /// Unstake a position after the lock has elapsed (Flexible = always).
    /// Pending rewards are paid out together with the principal.
    #[endpoint(unstake)]
    fn unstake(&self, position_id: u64) {
        let caller = self.blockchain().get_caller();
        let position = self.require_owned_position(&caller, position_id);
        let now = self.blockchain().get_block_timestamp();
        require!(
            now >= position.unlock_timestamp,
            "Position is still locked"
        );

        let rewards = self.pending_rewards(&position, now);
        let principal = position.amount.clone();
        let pool_id = position.pool_id;

        self.clear_position(&caller, &position);

        let mut payout = principal;
        payout += rewards;
        self.send_staking_token(&caller, &payout);

        let _ = pool_id;
    }

    /// Claim accrued rewards without closing the position.
    #[endpoint(claimRewards)]
    fn claim_rewards(&self, position_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut position = self.require_owned_position(&caller, position_id);
        let now = self.blockchain().get_block_timestamp();
        let rewards = self.pending_rewards(&position, now);
        require!(rewards > 0, "No rewards to claim");

        position.last_claim_timestamp = now;
        self.positions(position_id).set(&position);
        self.send_staking_token(&caller, &rewards);
    }

    /// Owner tops up the reward inventory held by the contract.
    #[only_owner]
    #[payable("*")]
    #[endpoint(fundRewards)]
    fn fund_rewards(&self) {
        let payment = self.call_value().single_esdt();
        require!(
            payment.token_identifier == self.staking_token().get(),
            "Wrong token"
        );
        require!(payment.amount > 0, "Empty funding");
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    #[view(getStakingToken)]
    #[storage_mapper("stakingToken")]
    fn staking_token(&self) -> SingleValueMapper<TokenIdentifier>;

    #[view(getNextPositionId)]
    #[storage_mapper("nextPositionId")]
    fn next_position_id(&self) -> SingleValueMapper<u64>;

    #[view(getPosition)]
    #[storage_mapper("positions")]
    fn positions(&self, position_id: u64) -> SingleValueMapper<StakePosition<Self::Api>>;

    #[view(getUserPositionIds)]
    #[storage_mapper("userPositionIds")]
    fn user_position_ids(&self, user: &ManagedAddress) -> UnorderedSetMapper<u64>;

    #[view(getTotalStakedInPool)]
    #[storage_mapper("totalStakedInPool")]
    fn total_staked_in_pool(&self, pool_id: u8) -> SingleValueMapper<BigUint>;

    #[view(getSyndicateStaked)]
    #[storage_mapper("syndicateStaked")]
    fn syndicate_staked(&self, user: &ManagedAddress) -> SingleValueMapper<BigUint>;

    #[view(isSyndicateEligible)]
    fn is_syndicate_eligible(&self, user: ManagedAddress) -> bool {
        self.syndicate_staked(&user).get() >= self.syndicate_min_amount()
    }

    #[view(getPendingRewards)]
    fn get_pending_rewards_view(&self, position_id: u64) -> BigUint {
        if self.positions(position_id).is_empty() {
            return BigUint::zero();
        }
        let position = self.positions(position_id).get();
        let now = self.blockchain().get_block_timestamp();
        self.pending_rewards(&position, now)
    }

    /// All open positions for a wallet (for frontend / backend sync).
    #[view(getUserPositions)]
    fn get_user_positions(
        &self,
        user: ManagedAddress,
    ) -> MultiValueEncoded<StakePosition<Self::Api>> {
        let mut out = MultiValueEncoded::new();
        for position_id in self.user_position_ids(&user).iter() {
            if !self.positions(position_id).is_empty() {
                out.push(self.positions(position_id).get());
            }
        }
        out
    }

    #[view(getPoolApyBps)]
    fn get_pool_apy_bps(&self, pool_id: u8) -> u64 {
        self.apy_bps_for_pool(pool_id)
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    fn require_valid_pool(&self, pool_id: u8) {
        require!(
            pool_id == POOL_FLEXIBLE
                || pool_id == POOL_LOCKED_30
                || pool_id == POOL_LOCKED_90,
            "Invalid pool id"
        );
    }

    fn unlock_timestamp_for_pool(&self, pool_id: u8, now: u64) -> u64 {
        match pool_id {
            POOL_FLEXIBLE => now,
            POOL_LOCKED_30 => now + LOCK_30_SECONDS,
            POOL_LOCKED_90 => now + LOCK_90_SECONDS,
            _ => sc_panic!("Invalid pool id"),
        }
    }

    fn apy_bps_for_pool(&self, pool_id: u8) -> u64 {
        match pool_id {
            POOL_FLEXIBLE => APY_FLEXIBLE_BPS,
            POOL_LOCKED_30 => APY_LOCKED_30_BPS,
            POOL_LOCKED_90 => APY_LOCKED_90_BPS,
            _ => 0,
        }
    }

    fn syndicate_min_amount(&self) -> BigUint {
        // 10_000 * 10^18
        BigUint::from(SYNDICATE_MIN_STAKE)
            * BigUint::from(10u64).pow(TOKEN_DECIMALS)
    }

    fn require_owned_position(
        &self,
        caller: &ManagedAddress,
        position_id: u64,
    ) -> StakePosition<Self::Api> {
        require!(
            self.user_position_ids(caller).contains(&position_id),
            "Position not owned by caller"
        );
        require!(
            !self.positions(position_id).is_empty(),
            "Position does not exist"
        );
        self.positions(position_id).get()
    }

    /// rewards = amount * apy_bps * elapsed / (10_000 * seconds_per_year)
    fn pending_rewards(&self, position: &StakePosition<Self::Api>, now: u64) -> BigUint {
        if now <= position.last_claim_timestamp {
            return BigUint::zero();
        }
        let elapsed = now - position.last_claim_timestamp;
        let apy_bps = self.apy_bps_for_pool(position.pool_id);
        if apy_bps == 0 {
            return BigUint::zero();
        }
        let year_seconds = BigUint::from(365u64 * SECONDS_PER_DAY);
        let numerator =
            position.amount.clone() * BigUint::from(apy_bps) * BigUint::from(elapsed);
        let denominator = BigUint::from(10_000u64) * year_seconds;
        numerator / denominator
    }

    fn clear_position(&self, caller: &ManagedAddress, position: &StakePosition<Self::Api>) {
        let amount = position.amount.clone();
        let pool_id = position.pool_id;
        let position_id = position.position_id;

        self.positions(position_id).clear();
        let _ = self.user_position_ids(caller).swap_remove(&position_id);

        self.total_staked_in_pool(pool_id).update(|v| {
            if *v >= amount {
                *v -= &amount;
            } else {
                *v = BigUint::zero();
            }
        });

        if pool_id == POOL_LOCKED_90 {
            self.syndicate_staked(caller).update(|v| {
                if *v >= amount {
                    *v -= &amount;
                } else {
                    *v = BigUint::zero();
                }
            });
        }
    }

    fn send_staking_token(&self, to: &ManagedAddress, amount: &BigUint) {
        if amount == &BigUint::zero() {
            return;
        }
        let token = self.staking_token().get();
        self.send().direct_esdt(to, &token, 0, amount);
    }
}
