-- Harden privileged plan RPCs even if earlier billing migrations were already applied.
-- Billing writes are performed by trusted server routes using the service-role client.
begin;

revoke all on function public.upsert_user_plan(uuid, text, text, text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.get_user_plan(uuid)
  from public, anon, authenticated;

grant execute on function public.upsert_user_plan(uuid, text, text, text, text, text, timestamptz)
  to service_role;
grant execute on function public.get_user_plan(uuid)
  to service_role;

-- Both SECURITY DEFINER functions use schema-qualified table/type names.
-- An empty search_path prevents object-shadowing attacks.
alter function public.upsert_user_plan(uuid, text, text, text, text, text, timestamptz)
  set search_path = '';
alter function public.get_user_plan(uuid)
  set search_path = '';

commit;
