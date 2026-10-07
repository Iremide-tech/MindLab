create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.canonical_auth_email(input_email text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  with normalized as (
    select lower(btrim(input_email)) as email
  ), parts as (
    select split_part(email, '@', 1) as local_part,
           split_part(email, '@', 2) as domain
      from normalized
  )
  select case
    when domain in ('gmail.com', 'googlemail.com') then
      regexp_replace(split_part(local_part, '+', 1), '\.', '', 'g') || '@gmail.com'
    else lower(btrim(input_email))
  end
    from parts;
$$;

do $$
begin
  if exists (
    select private.canonical_auth_email(email)
      from auth.users
     where email is not null
       and position('@' in email) > 0
     group by private.canonical_auth_email(email)
    having count(*) > 1
  ) then
    raise exception 'Cannot enable canonical email protection: existing accounts share a Gmail address or email identity. Resolve duplicate accounts before retrying this migration.';
  end if;
end;
$$;

create table if not exists private.auth_email_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  canonical_email text not null unique,
  created_at timestamptz not null default now()
);

revoke all on private.auth_email_claims from public, anon, authenticated;

insert into private.auth_email_claims (user_id, canonical_email)
select id, private.canonical_auth_email(email)
  from auth.users
 where email is not null
   and position('@' in email) > 0
on conflict (canonical_email) do nothing;

create or replace function private.claim_auth_email()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  canonical_email_value text;
begin
  if tg_op = 'UPDATE' and old.email is distinct from new.email then
    delete from private.auth_email_claims where user_id = new.id;
  end if;

  if new.email is null or position('@' in new.email) = 0 then
    return new;
  end if;

  canonical_email_value := private.canonical_auth_email(new.email);

  insert into private.auth_email_claims as claims (user_id, canonical_email)
  values (new.id, canonical_email_value)
  on conflict (canonical_email) do update
    set canonical_email = excluded.canonical_email
    where claims.user_id = excluded.user_id;

  if not found then
    raise exception 'An account already exists for this Gmail address.'
      using errcode = '23505', constraint = 'auth_email_claims_canonical_email_key';
  end if;

  return new;
end;
$$;

revoke all on function private.claim_auth_email() from public, anon, authenticated;

drop trigger if exists claim_canonical_auth_email on auth.users;
create trigger claim_canonical_auth_email
after insert or update of email on auth.users
for each row execute function private.claim_auth_email();
