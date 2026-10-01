create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  workspace_id_type text;
  workspace_owner_type text;
  column_name text;
begin
  if to_regclass('public.research_maps') is null then
    raise exception 'Expected public.research_maps to exist before applying workspace collaboration.';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into workspace_id_type
    from pg_attribute a
   where a.attrelid = 'public.research_maps'::regclass
     and a.attname = 'id'
     and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
    into workspace_owner_type
    from pg_attribute a
   where a.attrelid = 'public.research_maps'::regclass
     and a.attname = 'user_id'
     and not a.attisdropped;

  if workspace_id_type is distinct from 'uuid' or workspace_owner_type is distinct from 'uuid' then
    raise exception 'Expected research_maps.id and research_maps.user_id to be uuid columns; found %, %.', workspace_id_type, workspace_owner_type;
  end if;

  if to_regclass('public.research_map_members') is not null then
    foreach column_name in array array['id', 'map_id', 'user_id', 'role'] loop
      if not exists (
        select 1 from pg_attribute
         where attrelid = 'public.research_map_members'::regclass
           and attname = column_name
           and not attisdropped
      ) then
        raise exception 'Existing public.research_map_members is missing required column %; inspect it before applying this migration.', column_name;
      end if;
    end loop;
  end if;

  if to_regclass('public.research_map_invitations') is not null then
    foreach column_name in array array['id', 'map_id', 'email', 'invited_by', 'role', 'status', 'expires_at'] loop
      if not exists (
        select 1 from pg_attribute
         where attrelid = 'public.research_map_invitations'::regclass
           and attname = column_name
           and not attisdropped
      ) then
        raise exception 'Existing public.research_map_invitations is missing required column %; inspect it before applying this migration.', column_name;
      end if;
    end loop;

    if not exists (
      select 1 from pg_attribute
       where attrelid = 'public.research_map_invitations'::regclass
         and attname in ('token', 'token_hash')
         and not attisdropped
    ) then
      raise exception 'Existing public.research_map_invitations must have token or token_hash so existing links can be migrated safely.';
    end if;
  end if;

  if exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename in ('research_maps', 'research_map_members', 'research_map_invitations')
       and permissive = 'RESTRICTIVE'
       and roles && array['authenticated', 'public']::name[]
       and policyname not in (
         'research_maps_collaboration_select_guard',
         'research_maps_collaboration_insert_guard',
         'research_maps_collaboration_update_guard',
         'research_maps_collaboration_delete_guard',
         'research_map_members_select_members_guard',
         'research_map_invitations_select_owner_guard'
       )
  ) then
    raise exception 'Unknown restrictive RLS policies exist on collaboration tables; inspect and merge them before applying this migration.';
  end if;
end;
$$;

create table if not exists public.research_map_members (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.research_maps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  role text not null default 'collaborator',
  created_at timestamptz not null default now()
);

alter table public.research_map_members
  add column if not exists email text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.research_map_invitations (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.research_maps(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'collaborator',
  token_hash text not null,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz
);

alter table public.research_map_invitations
  add column if not exists token_hash text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists revoked_at timestamptz;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conrelid, conname
      from pg_constraint
     where conrelid in (
       'public.research_map_members'::regclass,
       'public.research_map_invitations'::regclass
     )
       and contype = 'c'
       and pg_get_constraintdef(oid) ~* '\m(role|status)\M'
  loop
    execute format(
      'alter table %s drop constraint %I',
      constraint_row.conrelid::regclass,
      constraint_row.conname
    );
  end loop;
end;
$$;

alter table public.research_map_members
  alter column role drop default,
  alter column role type text using role::text;

update public.research_map_members
   set role = case when role = 'owner' then 'owner' else 'collaborator' end,
       created_at = coalesce(created_at, now());

update public.research_map_members m
   set email = lower(u.email)
  from auth.users u
 where u.id = m.user_id
   and (m.email is null or btrim(m.email) = '');

with ranked_members as (
  select id,
         row_number() over (
           partition by map_id, user_id
           order by (role = 'owner') desc, created_at, id
         ) as position
    from public.research_map_members
)
delete from public.research_map_members m
 using ranked_members r
 where m.id = r.id
   and r.position > 1;

alter table public.research_map_members
  alter column role set default 'collaborator',
  alter column role set not null,
  alter column map_id set not null,
  alter column user_id set not null,
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.research_map_members'::regclass
       and conname = 'research_map_members_role_check'
  ) then
    alter table public.research_map_members
      add constraint research_map_members_role_check
      check (role in ('owner', 'collaborator'));
  end if;
end;
$$;

create unique index if not exists research_map_members_map_user_uidx
  on public.research_map_members(map_id, user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.research_map_members'::regclass
       and conname = 'research_map_members_map_id_fkey'
  ) then
    alter table public.research_map_members
      add constraint research_map_members_map_id_fkey
      foreign key (map_id) references public.research_maps(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.research_map_members'::regclass
       and conname = 'research_map_members_user_id_fkey'
  ) then
    alter table public.research_map_members
      add constraint research_map_members_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_attribute
     where attrelid = 'public.research_map_invitations'::regclass
       and attname = 'token'
       and not attisdropped
  ) then
    execute $migrate$
      update public.research_map_invitations
         set token_hash = encode(extensions.digest(convert_to(token::text, 'UTF8'), 'sha256'), 'hex')
       where token_hash is null and token is not null
    $migrate$;
    alter table public.research_map_invitations drop column token;
  end if;
end;
$$;

alter table public.research_map_invitations
  alter column role drop default,
  alter column status drop default,
  alter column role type text using role::text,
  alter column status type text using status::text;

update public.research_map_invitations
   set email = lower(btrim(email)),
       role = 'collaborator',
       status = case lower(status)
         when 'pending' then 'pending'
         when 'accepted' then 'accepted'
         when 'declined' then 'declined'
         when 'revoked' then 'revoked'
         when 'cancelled' then 'revoked'
         when 'expired' then 'expired'
         else 'revoked'
       end,
       expires_at = coalesce(expires_at, now() + interval '7 days'),
       created_at = coalesce(created_at, now());

do $$
begin
  if exists (
    select 1 from public.research_map_invitations
     where token_hash is null
        or email is null
        or btrim(email) = ''
        or invited_by is null
  ) then
    raise exception 'Existing invitation rows need a token, email, and inviter; resolve them before applying this migration.';
  end if;
end;
$$;

update public.research_map_invitations
   set status = 'expired'
 where status = 'pending'
   and expires_at <= now();

with duplicate_pending as (
  select id,
         row_number() over (
           partition by map_id, lower(email)
           order by created_at desc, id desc
         ) as position
    from public.research_map_invitations
   where status = 'pending'
)
update public.research_map_invitations i
   set status = 'revoked', revoked_at = now()
  from duplicate_pending d
 where d.id = i.id
   and d.position > 1;

alter table public.research_map_invitations
  alter column email set not null,
  alter column role set default 'collaborator',
  alter column role set not null,
  alter column token_hash set not null,
  alter column status set default 'pending',
  alter column status set not null,
  alter column expires_at set default (now() + interval '7 days'),
  alter column expires_at set not null,
  alter column invited_by set not null,
  alter column created_at set not null,
  alter column map_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.research_map_invitations'::regclass
       and conname = 'research_map_invitations_role_check'
  ) then
    alter table public.research_map_invitations
      add constraint research_map_invitations_role_check
      check (role = 'collaborator');
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.research_map_invitations'::regclass
       and conname = 'research_map_invitations_status_check'
  ) then
    alter table public.research_map_invitations
      add constraint research_map_invitations_status_check
      check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired'));
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.research_map_invitations'::regclass
       and conname = 'research_map_invitations_map_id_fkey'
  ) then
    alter table public.research_map_invitations
      add constraint research_map_invitations_map_id_fkey
      foreign key (map_id) references public.research_maps(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.research_map_invitations'::regclass
       and conname = 'research_map_invitations_invited_by_fkey'
  ) then
    alter table public.research_map_invitations
      add constraint research_map_invitations_invited_by_fkey
      foreign key (invited_by) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.research_map_invitations'::regclass
       and conname = 'research_map_invitations_accepted_by_fkey'
  ) then
    alter table public.research_map_invitations
      add constraint research_map_invitations_accepted_by_fkey
      foreign key (accepted_by) references auth.users(id) on delete set null;
  end if;
end;
$$;

create unique index if not exists research_map_invitations_token_hash_uidx
  on public.research_map_invitations(token_hash);

create unique index if not exists research_map_invitations_one_pending_email_uidx
  on public.research_map_invitations(map_id, lower(email))
  where status = 'pending';

create index if not exists research_map_invitations_owner_status_idx
  on public.research_map_invitations(map_id, status, created_at desc);

insert into public.research_map_members(map_id, user_id, email, role)
select m.id, m.user_id, lower(u.email), 'owner'
  from public.research_maps m
  left join auth.users u on u.id = m.user_id
on conflict (map_id, user_id) do update
  set role = 'owner',
      email = coalesce(excluded.email, public.research_map_members.email);

create or replace function public.ensure_research_map_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.research_map_members(map_id, user_id, email, role)
  select new.id, new.user_id, lower(u.email), 'owner'
    from auth.users u
   where u.id = new.user_id
  on conflict (map_id, user_id) do update
    set role = 'owner',
        email = coalesce(excluded.email, public.research_map_members.email);

  return new;
end;
$$;

drop trigger if exists research_maps_create_owner_membership on public.research_maps;
create trigger research_maps_create_owner_membership
after insert on public.research_maps
for each row execute function public.ensure_research_map_owner_membership();

create or replace function public.prevent_research_map_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.user_id is distinct from new.user_id then
    raise exception 'Workspace ownership cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists research_maps_prevent_owner_change on public.research_maps;
create trigger research_maps_prevent_owner_change
before update of user_id on public.research_maps
for each row execute function public.prevent_research_map_owner_change();

create or replace function public.is_research_map_owner(p_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.research_maps m
     where m.id = p_map_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_research_map_member(p_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.research_map_members m
     where m.map_id = p_map_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.protect_research_map_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and public.is_research_map_owner(old.map_id) then
      raise exception 'The workspace owner membership cannot be removed or changed.';
    end if;
    return old;
  end if;

  if old.role = 'owner'
     and public.is_research_map_owner(old.map_id)
     and (new.role <> 'owner' or new.user_id <> old.user_id or new.map_id <> old.map_id) then
    raise exception 'The workspace owner membership cannot be removed or changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists research_map_members_protect_owner on public.research_map_members;
create trigger research_map_members_protect_owner
before update or delete on public.research_map_members
for each row execute function public.protect_research_map_owner_membership();

create or replace function public.create_research_map_invitation(
  p_map_id uuid,
  p_email text,
  p_role text default 'collaborator'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_owner_email text;
  v_invitation_id uuid;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash text := encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex');
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'code', 'unauthenticated');
  end if;
  if p_role is distinct from 'collaborator' then
    return jsonb_build_object('success', false, 'code', 'invalid_role');
  end if;
  if length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+(\.[^@[:space:]]+)+$' then
    return jsonb_build_object('success', false, 'code', 'invalid_email');
  end if;
  if not public.is_research_map_owner(p_map_id) then
    return jsonb_build_object('success', false, 'code', 'owner_required');
  end if;

  select lower(u.email) into v_owner_email
    from auth.users u
   where u.id = auth.uid();
  if v_email = v_owner_email then
    return jsonb_build_object('success', false, 'code', 'self_invite');
  end if;

  update public.research_map_invitations
     set status = 'expired'
   where map_id = p_map_id
     and lower(email) = v_email
     and status = 'pending'
     and expires_at <= now();

  if exists (
    select 1
      from public.research_map_members m
      left join auth.users u on u.id = m.user_id
     where m.map_id = p_map_id
       and lower(coalesce(u.email, m.email, '')) = v_email
  ) then
    return jsonb_build_object('success', false, 'code', 'already_member');
  end if;

  begin
    insert into public.research_map_invitations(
      map_id, email, invited_by, role, token_hash, status, expires_at
    ) values (
      p_map_id, v_email, auth.uid(), 'collaborator', v_token_hash,
      'pending', now() + interval '7 days'
    ) returning id into v_invitation_id;
  exception when unique_violation then
    return jsonb_build_object('success', false, 'code', 'already_pending');
  end;

  return jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', v_invitation_id,
      'email', v_email,
      'role', 'collaborator',
      'status', 'pending',
      'expires_at', now() + interval '7 days',
      'token', v_token
    )
  );
end;
$$;

create or replace function public.get_research_map_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token_hash text;
  v_invitation jsonb;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 then
    return null;
  end if;

  v_token_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  update public.research_map_invitations
     set status = 'expired'
   where token_hash = v_token_hash
     and status = 'pending'
     and expires_at <= now();

  select jsonb_build_object(
    'id', i.id,
    'map_id', i.map_id,
    'workspace_title', m.title,
    'email', i.email,
    'role', i.role,
    'status', i.status,
    'expires_at', i.expires_at,
    'inviter_email', u.email
  ) into v_invitation
    from public.research_map_invitations i
    join public.research_maps m on m.id = i.map_id
    left join auth.users u on u.id = i.invited_by
   where i.token_hash = v_token_hash;

  return v_invitation;
end;
$$;

create or replace function public.accept_research_map_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_token_hash text;
  v_invitation public.research_map_invitations%rowtype;
  v_already_member boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'code', 'unauthenticated');
  end if;
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 then
    return jsonb_build_object('success', false, 'code', 'not_found');
  end if;

  v_token_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
  select * into v_invitation
    from public.research_map_invitations
   where token_hash = v_token_hash
   for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'not_found');
  end if;
  if v_invitation.status <> 'pending' then
    return jsonb_build_object('success', false, 'code', v_invitation.status);
  end if;
  if v_invitation.expires_at <= now() then
    update public.research_map_invitations set status = 'expired' where id = v_invitation.id;
    return jsonb_build_object('success', false, 'code', 'expired');
  end if;

  select lower(email), email_confirmed_at
    into v_user_email, v_email_confirmed_at
    from auth.users
   where id = v_user_id;
  if v_email_confirmed_at is null then
    return jsonb_build_object('success', false, 'code', 'email_unverified');
  end if;
  if v_user_email is null or v_user_email <> lower(v_invitation.email) then
    return jsonb_build_object('success', false, 'code', 'email_mismatch');
  end if;

  select exists (
    select 1 from public.research_map_members
     where map_id = v_invitation.map_id and user_id = v_user_id
  ) into v_already_member;

  if not v_already_member then
    insert into public.research_map_members(map_id, user_id, email, role)
    values (v_invitation.map_id, v_user_id, v_user_email, 'collaborator')
    on conflict (map_id, user_id) do nothing;
  end if;

  update public.research_map_invitations
     set status = 'accepted', accepted_by = v_user_id, accepted_at = now()
   where id = v_invitation.id;

  return jsonb_build_object(
    'success', true,
    'code', case when v_already_member then 'already_member' else 'accepted' end,
    'map_id', v_invitation.map_id
  );
end;
$$;

create or replace function public.decline_research_map_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_token_hash text;
  v_invitation public.research_map_invitations%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'code', 'unauthenticated');
  end if;
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 then
    return jsonb_build_object('success', false, 'code', 'not_found');
  end if;

  v_token_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
  select * into v_invitation
    from public.research_map_invitations
   where token_hash = v_token_hash
   for update;
  if not found then
    return jsonb_build_object('success', false, 'code', 'not_found');
  end if;
  if v_invitation.status <> 'pending' then
    return jsonb_build_object('success', false, 'code', v_invitation.status);
  end if;
  if v_invitation.expires_at <= now() then
    update public.research_map_invitations set status = 'expired' where id = v_invitation.id;
    return jsonb_build_object('success', false, 'code', 'expired');
  end if;

  select lower(email), email_confirmed_at
    into v_user_email, v_email_confirmed_at
    from auth.users
   where id = v_user_id;
  if v_email_confirmed_at is null then
    return jsonb_build_object('success', false, 'code', 'email_unverified');
  end if;
  if v_user_email is null or v_user_email <> lower(v_invitation.email) then
    return jsonb_build_object('success', false, 'code', 'email_mismatch');
  end if;

  update public.research_map_invitations
     set status = 'declined', declined_at = now()
   where id = v_invitation.id;

  return jsonb_build_object('success', true, 'code', 'declined');
end;
$$;

create or replace function public.expire_research_map_invitations(p_map_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_research_map_owner(p_map_id) then
    return jsonb_build_object('success', false, 'code', 'owner_required');
  end if;
  update public.research_map_invitations
     set status = 'expired'
   where map_id = p_map_id and status = 'pending' and expires_at <= now();
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.revoke_research_map_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_map_id uuid;
begin
  update public.research_map_invitations i
     set status = case when i.expires_at <= now() then 'expired' else 'revoked' end,
         revoked_at = case when i.expires_at <= now() then null else now() end
   where i.id = p_invitation_id
     and i.status = 'pending'
     and public.is_research_map_owner(i.map_id)
  returning i.map_id into v_map_id;

  if v_map_id is null then
    return jsonb_build_object('success', false, 'code', 'not_found_or_not_pending');
  end if;
  return jsonb_build_object('success', true);
end;
$$;

alter table public.research_maps enable row level security;
alter table public.research_map_members enable row level security;
alter table public.research_map_invitations enable row level security;

drop policy if exists research_maps_collaboration_select on public.research_maps;
drop policy if exists research_maps_collaboration_select_guard on public.research_maps;
drop policy if exists research_maps_collaboration_insert on public.research_maps;
drop policy if exists research_maps_collaboration_insert_guard on public.research_maps;
drop policy if exists research_maps_collaboration_update on public.research_maps;
drop policy if exists research_maps_collaboration_update_guard on public.research_maps;
drop policy if exists research_maps_collaboration_delete on public.research_maps;
drop policy if exists research_maps_collaboration_delete_guard on public.research_maps;
drop policy if exists research_map_members_select_members on public.research_map_members;
drop policy if exists research_map_members_select_members_guard on public.research_map_members;
drop policy if exists research_map_invitations_select_owner on public.research_map_invitations;
drop policy if exists research_map_invitations_select_owner_guard on public.research_map_invitations;

create policy research_maps_collaboration_select
  on public.research_maps for select to authenticated
  using (user_id = auth.uid() or public.is_research_map_member(id));

create policy research_maps_collaboration_select_guard
  on public.research_maps as restrictive for select to authenticated
  using (user_id = auth.uid() or public.is_research_map_member(id));

create policy research_maps_collaboration_insert
  on public.research_maps for insert to authenticated
  with check (user_id = auth.uid());

create policy research_maps_collaboration_insert_guard
  on public.research_maps as restrictive for insert to authenticated
  with check (user_id = auth.uid());

create policy research_maps_collaboration_update
  on public.research_maps for update to authenticated
  using (user_id = auth.uid() or public.is_research_map_member(id))
  with check (user_id = auth.uid() or public.is_research_map_member(id));

create policy research_maps_collaboration_update_guard
  on public.research_maps as restrictive for update to authenticated
  using (user_id = auth.uid() or public.is_research_map_member(id))
  with check (user_id = auth.uid() or public.is_research_map_member(id));

create policy research_maps_collaboration_delete
  on public.research_maps for delete to authenticated
  using (user_id = auth.uid());

create policy research_maps_collaboration_delete_guard
  on public.research_maps as restrictive for delete to authenticated
  using (user_id = auth.uid());

create policy research_map_members_select_members
  on public.research_map_members for select to authenticated
  using (public.is_research_map_member(map_id));

create policy research_map_members_select_members_guard
  on public.research_map_members as restrictive for select to authenticated
  using (public.is_research_map_member(map_id));

create policy research_map_invitations_select_owner
  on public.research_map_invitations for select to authenticated
  using (public.is_research_map_owner(map_id));

create policy research_map_invitations_select_owner_guard
  on public.research_map_invitations as restrictive for select to authenticated
  using (public.is_research_map_owner(map_id));

revoke all on public.research_map_members from public, anon, authenticated;
revoke all on public.research_map_invitations from public, anon, authenticated;
grant select on public.research_map_members to authenticated;
grant select on public.research_map_invitations to authenticated;
grant select, insert, update, delete on public.research_maps to authenticated;
revoke all on public.research_maps from public, anon;

revoke all on function public.is_research_map_owner(uuid) from public, anon;
revoke all on function public.is_research_map_member(uuid) from public, anon;
revoke all on function public.ensure_research_map_owner_membership() from public, anon, authenticated;
revoke all on function public.protect_research_map_owner_membership() from public, anon, authenticated;
revoke all on function public.prevent_research_map_owner_change() from public, anon, authenticated;
revoke all on function public.create_research_map_invitation(uuid, text, text) from public, anon;
revoke all on function public.get_research_map_invitation(text) from public;
revoke all on function public.accept_research_map_invitation(text) from public, anon;
revoke all on function public.decline_research_map_invitation(text) from public, anon;
revoke all on function public.expire_research_map_invitations(uuid) from public, anon;
revoke all on function public.revoke_research_map_invitation(uuid) from public, anon;

grant execute on function public.is_research_map_owner(uuid) to authenticated;
grant execute on function public.is_research_map_member(uuid) to authenticated;
grant execute on function public.create_research_map_invitation(uuid, text, text) to authenticated;
grant execute on function public.get_research_map_invitation(text) to anon, authenticated;
grant execute on function public.accept_research_map_invitation(text) to authenticated;
grant execute on function public.decline_research_map_invitation(text) to authenticated;
grant execute on function public.expire_research_map_invitations(uuid) to authenticated;
grant execute on function public.revoke_research_map_invitation(uuid) to authenticated;

notify pgrst, 'reload schema';