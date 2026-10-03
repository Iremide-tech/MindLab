create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'free' check (plan_code in ('free', 'student', 'research')),
  status text not null default 'active' check (status in ('active', 'trialing', 'cancelled', 'expired')),
  provider text not null default 'manual',
  provider_reference text,
  customer_email text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_usage_events_user_feature_idx
  on public.user_usage_events (user_id, feature, created_at desc);

create index if not exists user_usage_events_created_at_idx
  on public.user_usage_events (created_at desc);

alter table public.user_plans
  add column if not exists customer_email text,
  add column if not exists current_period_end timestamptz,
  add column if not exists provider text default 'manual',
  add column if not exists provider_reference text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_plans
  alter column provider set default 'manual';

create or replace function public.upsert_user_plan(
  p_user_id uuid,
  p_plan_code text,
  p_status text default 'active',
  p_provider text default 'manual',
  p_provider_reference text default null,
  p_customer_email text default null,
  p_current_period_end timestamptz default null
)
returns public.user_plans
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_plans (
    user_id,
    plan_code,
    status,
    provider,
    provider_reference,
    customer_email,
    current_period_end,
    updated_at
  )
  values (
    p_user_id,
    case when p_plan_code in ('free', 'student', 'research') then p_plan_code else 'free' end,
    case when p_status in ('active', 'trialing', 'cancelled', 'expired') then p_status else 'active' end,
    p_provider,
    p_provider_reference,
    p_customer_email,
    p_current_period_end,
    now()
  )
  on conflict (user_id)
  do update set
    plan_code = excluded.plan_code,
    status = excluded.status,
    provider = excluded.provider,
    provider_reference = excluded.provider_reference,
    customer_email = excluded.customer_email,
    current_period_end = excluded.current_period_end,
    updated_at = now()
  returning *;
end;
$$;

create or replace function public.get_user_plan(p_user_id uuid)
returns table (
  user_id uuid,
  plan_code text,
  status text,
  provider text,
  current_period_end timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    up.user_id,
    up.plan_code,
    up.status,
    up.provider,
    up.current_period_end
  from public.user_plans up
  where up.user_id = p_user_id;
$$;
