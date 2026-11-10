create or replace function public.leave_research_map(p_map_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_role text;
begin
  select role
    into membership_role
    from public.research_map_members
   where map_id = p_map_id
     and user_id = auth.uid()
   for update;

  if membership_role is null then
    return jsonb_build_object('success', false, 'code', 'not_member');
  end if;

  if membership_role = 'owner' then
    return jsonb_build_object('success', false, 'code', 'owner_cannot_leave');
  end if;

  delete from public.research_map_members
   where map_id = p_map_id
     and user_id = auth.uid()
     and role = 'collaborator';

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.leave_research_map(uuid) from public, anon;
grant execute on function public.leave_research_map(uuid) to authenticated;

notify pgrst, 'reload schema';
