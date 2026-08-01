-- EVOLGO referral program schema
-- Run this in the Supabase SQL Editor (once).

-- Personal invite codes bound to MultiversX wallets
create table if not exists public.referral_codes (
  wallet_address text primary key,
  code text not null unique,
  tier text not null default 'Operator',
  created_at timestamptz not null default now(),
  constraint referral_codes_code_len check (char_length(code) = 6)
);

create index if not exists referral_codes_code_idx
  on public.referral_codes (code);

-- Attribution ledger for referred purchases
create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  payment_tx_hash text unique,
  referred_wallet text not null,
  referrer_code text not null,
  referrer_wallet text,
  amount_nova numeric not null default 0,
  amount_nova_atomic text not null default '0',
  reward_tx_hash text,
  status text not null default 'pending',
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists referral_attributions_referrer_code_idx
  on public.referral_attributions (referrer_code);

create index if not exists referral_attributions_referrer_wallet_idx
  on public.referral_attributions (referrer_wallet);

create index if not exists referral_attributions_referred_wallet_idx
  on public.referral_attributions (referred_wallet);

-- Claimable / claimed balances per referrer wallet
create table if not exists public.referral_balances (
  wallet_address text primary key,
  claimable_balance numeric not null default 0,
  total_claimed numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- Service-role API writes; lock down anon access by default.
alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.referral_balances enable row level security;
