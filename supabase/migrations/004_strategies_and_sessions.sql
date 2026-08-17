-- Strategy catalog + runtime sessions
-- Links wallet → agent → strategy → exchange API key for live runs.
-- Run in the Supabase SQL Editor after 002/003.

-- ---------------------------------------------------------------------------
-- Catalog of trading strategies (code-defined ids stay stable).
-- ---------------------------------------------------------------------------
create table if not exists public.trading_strategies (
  id text primary key,
  name text not null,
  slug text not null unique,
  blurb text not null default '',
  status text not null default 'live',
  created_at timestamptz not null default now(),
  constraint trading_strategies_status_check
    check (status in ('live', 'beta', 'coming_soon', 'deprecated'))
);

insert into public.trading_strategies (id, name, slug, blurb, status)
values
  (
    'evolgo-consensus',
    'EvolgoConsensusStrategy',
    'evolgo-consensus',
    'Multi-signal consensus engine — mean reversion + microstructure filters.',
    'live'
  ),
  (
    'evolgo-pump-hunter',
    'EvolgoPumpHunter',
    'evolgo-pump-hunter',
    'Impulse / breakout hunter for short-lived momentum bursts.',
    'beta'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Operator identity is MultiversX wallet_address (no separate users table yet).
-- Runtime session = who is running which agent strategy with which venue key.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_runtime_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  agent_id text not null,
  strategy_id text not null references public.trading_strategies (id),
  exchange_key_id uuid references public.exchange_api_keys (id) on delete set null,
  status text not null default 'stopped',
  started_at timestamptz,
  stopped_at timestamptz,
  last_heartbeat_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_runtime_sessions_status_check
    check (status in ('live', 'stopped', 'error'))
);

-- One live session per wallet + agent + strategy.
create unique index if not exists agent_runtime_sessions_live_unique
  on public.agent_runtime_sessions (wallet_address, agent_id, strategy_id)
  where status = 'live';

create index if not exists agent_runtime_sessions_wallet_idx
  on public.agent_runtime_sessions (wallet_address);

create index if not exists agent_runtime_sessions_agent_idx
  on public.agent_runtime_sessions (agent_id);

create index if not exists agent_runtime_sessions_strategy_idx
  on public.agent_runtime_sessions (strategy_id);

alter table public.trading_strategies enable row level security;
alter table public.agent_runtime_sessions enable row level security;
