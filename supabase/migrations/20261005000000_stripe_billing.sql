alter table public.user_plans
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists user_plans_stripe_customer_id_uidx
  on public.user_plans (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists user_plans_stripe_subscription_id_uidx
  on public.user_plans (stripe_subscription_id)
  where stripe_subscription_id is not null;