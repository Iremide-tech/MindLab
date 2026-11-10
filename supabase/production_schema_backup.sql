--
-- PostgreSQL database dump
--

\restrict max72hwZQmZoz0O5OYxGYPktCqAWyMaXbEHNUoNwIhsLB0JOiN7LGg85nSal1kG

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA private;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: canonical_auth_email(text); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.canonical_auth_email(input_email text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    SET search_path TO 'pg_catalog'
    AS $$
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


--
-- Name: claim_auth_email(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.claim_auth_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'private'
    AS $$
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


--
-- Name: user_is_map_member(uuid); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.user_is_map_member(target_map_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.research_map_members
    where map_id = target_map_id
      and user_id = (select auth.uid())
  );
$$;


--
-- Name: accept_research_map_invitation(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_research_map_invitation(p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: create_research_map_invitation(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_research_map_invitation(p_map_id uuid, p_email text, p_role text DEFAULT 'collaborator'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
$_$;


--
-- Name: decline_research_map_invitation(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decline_research_map_invitation(p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: ensure_research_map_owner_membership(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_research_map_owner_membership() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: expire_research_map_invitations(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_research_map_invitations(p_map_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: get_research_map_invitation(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_research_map_invitation(p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: get_user_plan(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_plan(p_user_id uuid) RETURNS TABLE(user_id uuid, plan_code text, status text, provider text, current_period_end timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select up.user_id, up.plan_code, up.status, up.provider, up.current_period_end
  from public.user_plans up where up.user_id = p_user_id;
$$;


--
-- Name: is_research_map_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_research_map_member(p_map_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.research_map_members m
     where m.map_id = p_map_id and m.user_id = auth.uid()
  );
$$;


--
-- Name: is_research_map_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_research_map_owner(p_map_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.research_maps m
     where m.id = p_map_id and m.user_id = auth.uid()
  );
$$;


--
-- Name: prevent_research_map_owner_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_research_map_owner_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if old.user_id is distinct from new.user_id then
    raise exception 'Workspace ownership cannot be changed.';
  end if;
  return new;
end;
$$;


--
-- Name: protect_research_map_owner_membership(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_research_map_owner_membership() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


--
-- Name: revoke_research_map_invitation(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_research_map_invitation(p_invitation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_plans (
    user_id uuid NOT NULL,
    plan_code text DEFAULT 'free'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    provider text DEFAULT 'manual'::text NOT NULL,
    provider_reference text,
    customer_email text,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    CONSTRAINT user_plans_plan_code_check CHECK ((plan_code = ANY (ARRAY['free'::text, 'student'::text, 'research'::text]))),
    CONSTRAINT user_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'cancelled'::text, 'expired'::text])))
);


--
-- Name: upsert_user_plan(uuid, text, text, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_user_plan(p_user_id uuid, p_plan_code text, p_status text DEFAULT 'active'::text, p_provider text DEFAULT 'manual'::text, p_provider_reference text DEFAULT NULL::text, p_customer_email text DEFAULT NULL::text, p_current_period_end timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS public.user_plans
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_row public.user_plans;
begin
  insert into public.user_plans (
    user_id, plan_code, status, provider, provider_reference,
    customer_email, current_period_end, updated_at
  )
  values (
    p_user_id,
    case when p_plan_code in ('free', 'student', 'research') then p_plan_code else 'free' end,
    case when p_status in ('active', 'trialing', 'cancelled', 'expired') then p_status else 'active' end,
    p_provider, p_provider_reference, p_customer_email, p_current_period_end, now()
  )
  on conflict (user_id) do update set
    plan_code = excluded.plan_code,
    status = excluded.status,
    provider = excluded.provider,
    provider_reference = excluded.provider_reference,
    customer_email = excluded.customer_email,
    current_period_end = excluded.current_period_end,
    updated_at = now()
  returning * into v_row;
  
  return v_row;
end;
$$;


--
-- Name: user_is_map_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_is_map_member(target_map_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.research_map_members
    where map_id = target_map_id
      and user_id = auth.uid()
  );
$$;


--
-- Name: auth_email_claims; Type: TABLE; Schema: private; Owner: -
--

CREATE TABLE private.auth_email_claims (
    user_id uuid NOT NULL,
    canonical_email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: research_map_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_map_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    map_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'collaborator'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_by uuid NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    token_hash text NOT NULL,
    accepted_by uuid,
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    revoked_at timestamp with time zone,
    CONSTRAINT research_map_invitations_role_check CHECK ((role = 'collaborator'::text)),
    CONSTRAINT research_map_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'revoked'::text, 'expired'::text])))
);


--
-- Name: research_map_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_map_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    map_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'collaborator'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    CONSTRAINT research_map_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'collaborator'::text])))
);


--
-- Name: research_maps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    edges jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_usage_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    feature text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_email_claims auth_email_claims_canonical_email_key; Type: CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.auth_email_claims
    ADD CONSTRAINT auth_email_claims_canonical_email_key UNIQUE (canonical_email);


--
-- Name: auth_email_claims auth_email_claims_pkey; Type: CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.auth_email_claims
    ADD CONSTRAINT auth_email_claims_pkey PRIMARY KEY (user_id);


--
-- Name: research_map_invitations research_map_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_map_invitations
    ADD CONSTRAINT research_map_invitations_pkey PRIMARY KEY (id);


--
-- Name: research_map_members research_map_members_map_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_map_members
    ADD CONSTRAINT research_map_members_map_id_user_id_key UNIQUE (map_id, user_id);


--
-- Name: research_map_members research_map_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_map_members
    ADD CONSTRAINT research_map_members_pkey PRIMARY KEY (id);


--
-- Name: research_maps research_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_maps
    ADD CONSTRAINT research_maps_pkey PRIMARY KEY (id);


--
-- Name: user_plans user_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_plans
    ADD CONSTRAINT user_plans_pkey PRIMARY KEY (user_id);


--
-- Name: user_usage_events user_usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_usage_events
    ADD CONSTRAINT user_usage_events_pkey PRIMARY KEY (id);


--
-- Name: research_map_invitations_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX research_map_invitations_email_idx ON public.research_map_invitations USING btree (lower(email));


--
-- Name: research_map_invitations_one_pending_email_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX research_map_invitations_one_pending_email_uidx ON public.research_map_invitations USING btree (map_id, lower(email)) WHERE (status = 'pending'::text);


--
-- Name: research_map_invitations_owner_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX research_map_invitations_owner_status_idx ON public.research_map_invitations USING btree (map_id, status, created_at DESC);


--
-- Name: research_map_invitations_token_hash_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX research_map_invitations_token_hash_uidx ON public.research_map_invitations USING btree (token_hash);


--
-- Name: research_map_members_map_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX research_map_members_map_id_idx ON public.research_map_members USING btree (map_id);


--
-- Name: research_map_members_map_user_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX research_map_members_map_user_uidx ON public.research_map_members USING btree (map_id, user_id);


--
-- Name: research_map_members_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX research_map_members_user_id_idx ON public.research_map_members USING btree (user_id);


--
-- Name: user_plans_stripe_customer_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_plans_stripe_customer_id_uidx ON public.user_plans USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);


--
-- Name: user_plans_stripe_subscription_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_plans_stripe_subscription_id_uidx ON public.user_plans USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);


--
-- Name: user_usage_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_usage_events_created_at_idx ON public.user_usage_events USING btree (created_at DESC);


--
-- Name: user_usage_events_user_feature_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_usage_events_user_feature_idx ON public.user_usage_events USING btree (user_id, feature, created_at DESC);


--
-- Name: research_map_members research_map_members_protect_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER research_map_members_protect_owner BEFORE DELETE OR UPDATE ON public.research_map_members FOR EACH ROW EXECUTE FUNCTION public.protect_research_map_owner_membership();


--
-- Name: research_maps research_maps_create_owner_membership; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER research_maps_create_owner_membership AFTER INSERT ON public.research_maps FOR EACH ROW EXECUTE FUNCTION public.ensure_research_map_owner_membership();


--
-- Name: research_maps research_maps_prevent_owner_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER research_maps_prevent_owner_change BEFORE UPDATE OF user_id ON public.research_maps FOR EACH ROW EXECUTE FUNCTION public.prevent_research_map_owner_change();


--
-- Name: auth_email_claims auth_email_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.auth_email_claims
    ADD CONSTRAINT auth_email_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: research_map_invitations research_map_invitations_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_map_invitations
    ADD CONSTRAINT research_map_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: research_map_invitations research_map_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_map_invitations
    ADD CONSTRAINT research_map_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: research_map_invitations research_map_invitations_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_map_invitations
    ADD CONSTRAINT research_map_invitations_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.research_maps(id) ON DELETE CASCADE;


--
-- Name: research_map_members research_map_members_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_map_members
    ADD CONSTRAINT research_map_members_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.research_maps(id) ON DELETE CASCADE;


--
-- Name: research_map_members research_map_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_map_members
    ADD CONSTRAINT research_map_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: research_maps research_maps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_maps
    ADD CONSTRAINT research_maps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_plans user_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_plans
    ADD CONSTRAINT user_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_usage_events user_usage_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_usage_events
    ADD CONSTRAINT user_usage_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: auth_email_claims; Type: ROW SECURITY; Schema: private; Owner: -
--

ALTER TABLE private.auth_email_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: research_maps Owners and collaborators can view maps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and collaborators can view maps" ON public.research_maps FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.user_is_map_member(id)));


--
-- Name: research_map_members Owners can view map members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view map members" ON public.research_map_members FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.research_maps
  WHERE ((research_maps.id = research_map_members.map_id) AND (research_maps.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: research_maps Users can create their own maps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own maps" ON public.research_maps FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: research_maps Users can update their own maps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own maps" ON public.research_maps FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_plans Users can view own plan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own plan" ON public.user_plans FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_usage_events Users can view own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own usage" ON public.user_usage_events FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: research_map_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_map_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: research_map_invitations research_map_invitations_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_map_invitations_select_owner ON public.research_map_invitations FOR SELECT TO authenticated USING (public.is_research_map_owner(map_id));


--
-- Name: research_map_invitations research_map_invitations_select_owner_guard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_map_invitations_select_owner_guard ON public.research_map_invitations AS RESTRICTIVE FOR SELECT TO authenticated USING (public.is_research_map_owner(map_id));


--
-- Name: research_map_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_map_members ENABLE ROW LEVEL SECURITY;

--
-- Name: research_map_members research_map_members_select_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_map_members_select_members ON public.research_map_members FOR SELECT TO authenticated USING (public.is_research_map_member(map_id));


--
-- Name: research_map_members research_map_members_select_members_guard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_map_members_select_members_guard ON public.research_map_members AS RESTRICTIVE FOR SELECT TO authenticated USING (public.is_research_map_member(map_id));


--
-- Name: research_maps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_maps ENABLE ROW LEVEL SECURITY;

--
-- Name: research_maps research_maps_collaboration_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_maps_collaboration_delete ON public.research_maps FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: research_maps research_maps_collaboration_delete_guard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_maps_collaboration_delete_guard ON public.research_maps AS RESTRICTIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: research_maps research_maps_collaboration_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_maps_collaboration_insert ON public.research_maps FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: research_maps research_maps_collaboration_insert_guard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_maps_collaboration_insert_guard ON public.research_maps AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: research_maps research_maps_collaboration_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_maps_collaboration_select ON public.research_maps FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_research_map_member(id)));


--
-- Name: research_maps research_maps_collaboration_select_guard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_maps_collaboration_select_guard ON public.research_maps AS RESTRICTIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_research_map_member(id)));


--
-- Name: research_maps research_maps_collaboration_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_maps_collaboration_update ON public.research_maps FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR public.is_research_map_member(id))) WITH CHECK (((user_id = auth.uid()) OR public.is_research_map_member(id)));


--
-- Name: research_maps research_maps_collaboration_update_guard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_maps_collaboration_update_guard ON public.research_maps AS RESTRICTIVE FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR public.is_research_map_member(id))) WITH CHECK (((user_id = auth.uid()) OR public.is_research_map_member(id)));


--
-- Name: user_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: user_usage_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_usage_events ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict max72hwZQmZoz0O5OYxGYPktCqAWyMaXbEHNUoNwIhsLB0JOiN7LGg85nSal1kG

