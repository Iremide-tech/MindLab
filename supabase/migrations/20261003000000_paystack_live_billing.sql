alter table public.user_plans
  add column if not exists paystack_customer_code text,
  add column if not exists paystack_subscription_code text;

create unique index if not exists user_plans_paystack_customer_code_uidx
  on public.user_plans (paystack_customer_code)
  where paystack_customer_code is not null;

create table if not exists public.paystack_checkout_sessions (
  reference text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('student', 'research')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.user_plans enable row level security;
alter table public.user_usage_events enable row level security;
alter table public.paystack_checkout_sessions enable row level security;

drop policy if exists user_plans_select_own on public.user_plans;
create policy user_plans_select_own
  on public.user_plans for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_usage_events_select_own on public.user_usage_events;
create policy user_usage_events_select_own
  on public.user_usage_events for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_usage_events_insert_own on public.user_usage_events;
create policy user_usage_events_insert_own
  on public.user_usage_events for insert
  to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.user_plans from anon, authenticated;
grant select on public.user_plans to authenticated;
revoke all on public.paystack_checkout_sessions from anon, authenticated;
revoke all on public.user_usage_events from anon, authenticated;
grant select, insert on public.user_usage_events to authenticated;

revoke execute on function public.upsert_user_plan(uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.get_user_plan(uuid) from public, anon, authenticated;
grant execute on function public.upsert_user_plan(uuid, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.get_user_plan(uuid) to service_role;
