-- FitHub 1.6.17 additive migration.
-- Run once after UPDATE_2026_08_24_FITHUB_1_6_16_ADDITIVE.sql.
-- This migration keeps each participant's completed workout private while synchronizing the shared exercise plan.
begin;

alter table public.shared_gym_sessions
  add column if not exists gym_invite_id uuid unique references public.gym_invites(id) on delete cascade,
  add column if not exists leader_id uuid references auth.users(id) on delete set null,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists plan_revision bigint not null default 0;

update public.shared_gym_sessions set leader_id=creator_id where leader_id is null;

create or replace function public.sync_gym_invite_to_shared_session()
returns trigger language plpgsql security definer set search_path=public as $$
declare linked_session uuid;
begin
  if tg_op='INSERT' then
    insert into public.shared_gym_sessions(gym_invite_id,creator_id,leader_id,title,planned_for,status)
    values(new.id,new.sender_id,new.sender_id,coalesce(nullif(new.workout_name,''),nullif(new.gym_name,''),'Gym session'),new.session_at,'invited')
    on conflict(gym_invite_id) do update set planned_for=excluded.planned_for
    returning id into linked_session;
    insert into public.shared_gym_participants(shared_session_id,user_id,invite_status,publish_consent)
    values(linked_session,new.sender_id,'accepted',false),(linked_session,new.recipient_id,'pending',false)
    on conflict(shared_session_id,user_id) do nothing;
  else
    select id into linked_session from public.shared_gym_sessions where gym_invite_id=new.id;
    if linked_session is not null then
      update public.shared_gym_participants
        set invite_status=case when new.status='accepted' then 'accepted' when new.status in ('declined','cancelled') then 'declined' else 'pending' end
        where shared_session_id=linked_session and user_id=new.recipient_id;
      update public.shared_gym_sessions
        set planned_for=new.session_at,
            title=coalesce(nullif(new.workout_name,''),nullif(new.gym_name,''),title),
            status=case when new.status='accepted' then 'ready' when new.status in ('declined','cancelled') then new.status else 'invited' end
        where id=linked_session;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists sync_gym_invite_to_shared_session_insert on public.gym_invites;
drop trigger if exists sync_gym_invite_to_shared_session_update on public.gym_invites;
create trigger sync_gym_invite_to_shared_session_insert
after insert on public.gym_invites for each row execute function public.sync_gym_invite_to_shared_session();
create trigger sync_gym_invite_to_shared_session_update
after update of status,session_at,gym_name,workout_name on public.gym_invites for each row execute function public.sync_gym_invite_to_shared_session();

insert into public.shared_gym_sessions(gym_invite_id,creator_id,leader_id,title,planned_for,status)
select i.id,i.sender_id,i.sender_id,coalesce(nullif(i.workout_name,''),nullif(i.gym_name,''),'Gym session'),i.session_at,
       case when i.status='accepted' then 'ready' when i.status in ('declined','cancelled') then i.status else 'invited' end
from public.gym_invites i
where not exists(select 1 from public.shared_gym_sessions s where s.gym_invite_id=i.id)
on conflict(gym_invite_id) do nothing;

insert into public.shared_gym_participants(shared_session_id,user_id,invite_status,publish_consent)
select s.id,i.sender_id,'accepted',false from public.shared_gym_sessions s join public.gym_invites i on i.id=s.gym_invite_id
on conflict(shared_session_id,user_id) do nothing;
insert into public.shared_gym_participants(shared_session_id,user_id,invite_status,publish_consent)
select s.id,i.recipient_id,case when i.status='accepted' then 'accepted' when i.status in ('declined','cancelled') then 'declined' else 'pending' end,false
from public.shared_gym_sessions s join public.gym_invites i on i.id=s.gym_invite_id
on conflict(shared_session_id,user_id) do nothing;

alter table public.shared_gym_participants
  add column if not exists workout_mode text not null default 'undecided',
  add column if not exists synced_at timestamptz,
  add column if not exists left_sync_at timestamptz;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='shared_gym_participants_workout_mode_check'
      and conrelid='public.shared_gym_participants'::regclass
  ) then
    alter table public.shared_gym_participants
      add constraint shared_gym_participants_workout_mode_check
      check (workout_mode in ('undecided','synced','individual'));
  end if;
end $$;

create table if not exists public.shared_gym_workout_plans (
  shared_session_id uuid primary key references public.shared_gym_sessions(id) on delete cascade,
  title text not null default 'Shared workout',
  plan jsonb not null default '[]'::jsonb check (jsonb_typeof(plan)='array'),
  revision bigint not null default 1,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

alter table public.shared_gym_workout_plans enable row level security;

create or replace function public.is_shared_gym_accepted(session_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.shared_gym_sessions s
    where s.id=session_id and s.creator_id=auth.uid()
  ) or exists(
    select 1 from public.shared_gym_participants p
    where p.shared_session_id=session_id and p.user_id=auth.uid() and p.invite_status='accepted'
  )
$$;

create or replace function public.is_shared_gym_leader(session_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.shared_gym_sessions s
    where s.id=session_id and coalesce(s.leader_id,s.creator_id)=auth.uid()
  )
$$;

drop policy if exists shared_gym_owner_update on public.shared_gym_sessions;
-- Session state and leadership changes go through the checked RPCs below.
-- Leaving no general client UPDATE policy prevents a leader from rewriting
-- protected ownership/session fields through PostgREST.

drop policy if exists shared_gym_participants_invite on public.shared_gym_participants;
drop policy if exists shared_gym_participants_reply on public.shared_gym_participants;
create policy shared_gym_participants_invite on public.shared_gym_participants
  for insert to authenticated
  with check (public.is_shared_gym_leader(shared_session_id));
create policy shared_gym_participants_reply on public.shared_gym_participants
  for update to authenticated
  using (user_id=auth.uid())
  with check (
    user_id=auth.uid()
    and (
      workout_session_id is null
      or exists(select 1 from public.workout_sessions w where w.id=public.shared_gym_participants.workout_session_id and w.user_id=auth.uid())
    )
  );

drop policy if exists shared_gym_plans_read on public.shared_gym_workout_plans;
drop policy if exists shared_gym_plans_insert on public.shared_gym_workout_plans;
drop policy if exists shared_gym_plans_update on public.shared_gym_workout_plans;
drop policy if exists shared_gym_plans_delete on public.shared_gym_workout_plans;
create policy shared_gym_plans_read on public.shared_gym_workout_plans
  for select to authenticated using (public.is_shared_gym_accepted(shared_session_id));
create policy shared_gym_plans_insert on public.shared_gym_workout_plans
  for insert to authenticated with check (public.is_shared_gym_leader(shared_session_id) and updated_by=auth.uid());
create policy shared_gym_plans_update on public.shared_gym_workout_plans
  for update to authenticated using (public.is_shared_gym_leader(shared_session_id))
  with check (public.is_shared_gym_leader(shared_session_id) and updated_by=auth.uid());
create policy shared_gym_plans_delete on public.shared_gym_workout_plans
  for delete to authenticated using (public.is_shared_gym_leader(shared_session_id));

create or replace function public.bump_shared_gym_plan_revision()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.revision := case when tg_op='INSERT' then 1 else old.revision+1 end;
  new.updated_at := now();
  update public.shared_gym_sessions set plan_revision=new.revision where id=new.shared_session_id;
  return new;
end $$;

drop trigger if exists bump_shared_gym_plan_revision on public.shared_gym_workout_plans;
create trigger bump_shared_gym_plan_revision
before insert or update on public.shared_gym_workout_plans
for each row execute function public.bump_shared_gym_plan_revision();

create or replace function public.start_shared_gym_session(p_session_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_shared_gym_leader(p_session_id) then raise exception 'Only the workout leader can start this session'; end if;
  update public.shared_gym_sessions
    set status='active', started_at=coalesce(started_at,now()), leader_id=coalesce(leader_id,creator_id)
    where id=p_session_id;
end $$;

create or replace function public.set_shared_gym_workout_mode(p_session_id uuid,p_mode text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_mode not in ('synced','individual') then raise exception 'Invalid workout mode'; end if;
  update public.shared_gym_participants
    set workout_mode=p_mode,
        synced_at=case when p_mode='synced' then now() else synced_at end,
        left_sync_at=case when p_mode='individual' then now() else null end
    where shared_session_id=p_session_id and user_id=auth.uid() and invite_status='accepted';
  if not found then raise exception 'Accept this gym invitation before choosing a workout mode'; end if;
end $$;

create or replace function public.transfer_shared_gym_leader(p_session_id uuid,p_new_leader uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_shared_gym_leader(p_session_id) then raise exception 'Only the current leader can transfer control'; end if;
  if not exists(
    select 1 from public.shared_gym_participants
    where shared_session_id=p_session_id and user_id=p_new_leader and invite_status='accepted'
  ) then raise exception 'The new leader must be an accepted participant'; end if;
  update public.shared_gym_sessions set leader_id=p_new_leader where id=p_session_id;
end $$;

grant select,insert,update,delete on table public.shared_gym_workout_plans to authenticated;
revoke execute on function public.start_shared_gym_session(uuid) from public;
revoke execute on function public.set_shared_gym_workout_mode(uuid,text) from public;
revoke execute on function public.transfer_shared_gym_leader(uuid,uuid) from public;
grant execute on function public.start_shared_gym_session(uuid) to authenticated;
grant execute on function public.set_shared_gym_workout_mode(uuid,text) to authenticated;
grant execute on function public.transfer_shared_gym_leader(uuid,uuid) to authenticated;
revoke execute on function public.sync_gym_invite_to_shared_session() from public;
revoke execute on function public.bump_shared_gym_plan_revision() from public;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shared_gym_sessions') then
    alter publication supabase_realtime add table public.shared_gym_sessions;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shared_gym_participants') then
    alter publication supabase_realtime add table public.shared_gym_participants;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shared_gym_workout_plans') then
    alter publication supabase_realtime add table public.shared_gym_workout_plans;
  end if;
end $$;

commit;
