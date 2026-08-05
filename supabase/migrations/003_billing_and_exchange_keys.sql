-- Billing auto-renew flag + encrypted exchange API credentials
-- Run in the Supabase SQL Editor.

alter table public.agent_subscriptions
  add column if not exists auto_renew boolean not null default true;

create table if not exists public.exchange_api_keys (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  exchange_id text not null,
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  api_key_hint text not null default '',
  status text not null default 'connected',
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exchange_api_keys_status_check
    check (status in ('connected', 'error', 'revoked')),
  constraint exchange_api_keys_wallet_exchange_unique
    unique (wallet_address, exchange_id)
);

create index if not exists exchange_api_keys_wallet_idx
  on public.exchange_api_keys (wallet_address);

alter table public.exchange_api_keys enable row level security;
