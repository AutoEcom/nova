-- EVOLGO agent marketplace subscriptions
-- Run this in the Supabase SQL Editor (once).

create table if not exists public.agent_subscriptions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  agent_id text not null,
  status text not null default 'active',
  payment_asset text not null,
  amount_paid text not null default '0',
  payment_tx_hash text unique,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint agent_subscriptions_status_check
    check (status in ('active', 'expired', 'cancelled')),
  constraint agent_subscriptions_asset_check
    check (payment_asset in ('USDC', 'NOVA'))
);

create unique index if not exists agent_subscriptions_active_unique
  on public.agent_subscriptions (wallet_address, agent_id)
  where status = 'active';

create index if not exists agent_subscriptions_wallet_idx
  on public.agent_subscriptions (wallet_address);

create index if not exists agent_subscriptions_agent_idx
  on public.agent_subscriptions (agent_id);

create index if not exists agent_subscriptions_expires_idx
  on public.agent_subscriptions (expires_at);

alter table public.agent_subscriptions enable row level security;
