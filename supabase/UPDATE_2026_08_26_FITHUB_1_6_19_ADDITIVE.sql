-- FitHub 1.6.19 additive update
-- Run once after UPDATE_2026_08_25_FITHUB_1_6_18_ADDITIVE.sql.
-- This is additive and keeps all existing workout, PR and club history.

begin;

create extension if not exists pgcrypto;

alter table public.club_unlocks
  add column if not exists last_qualified_at timestamptz not null default now();

create table if not exists public.current_club_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  club_key text not null,
  threshold_kg numeric not null check (threshold_kg > 0),
  qualifying_weight_kg numeric not null check (qualifying_weight_kg >= threshold_kg),
  achieved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_name),
  unique (user_id, club_key)
);

alter table public.current_club_memberships enable row level security;
drop policy if exists current_clubs_read on public.current_club_memberships;
create policy current_clubs_read on public.current_club_memberships
for select to authenticated using (user_id = auth.uid());
drop policy if exists current_clubs_own_write on public.current_club_memberships;
create policy current_clubs_own_write on public.current_club_memberships
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists workout_sets_user_exercise_weight_idx
  on public.workout_sets(user_id, lower(exercise_name), weight_kg desc)
  where weight_kg > 0;

-- Use exact normalized aliases so, for example, Dumbbell Bench Press never unlocks
-- the Barbell Bench Press club.
create or replace function public.fithub_canonical_club_lift(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  with normalized as (
    select trim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', ' ', 'g')) as value
  )
  select case
    when value in ('bench press','benchpress','flat bench press','barbell bench press','barbell benchpress','barbell flat bench press') then 'Barbell Bench Press'
    when value in ('back squat','barbell squat','barbell back squat','high bar squat','high bar back squat','low bar squat','low bar back squat') then 'Barbell Back Squat'
    when value in ('deadlift','conventional deadlift','barbell deadlift','barbell conventional deadlift') then 'Conventional Deadlift'
    when value in ('overhead press','barbell overhead press','standing overhead press','military press','barbell military press') then 'Overhead Press'
    else null
  end
  from normalized
$$;

create or replace function public.refresh_my_current_clubs()
returns table (
  exercise_name text,
  club_key text,
  threshold_kg numeric,
  qualifying_weight_kg numeric,
  achieved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  member_age integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select coalesce(
    case when p.date_of_birth is not null then public.fithub_age_from_birth(p.date_of_birth) end,
    p.age,
    0
  ) into member_age
  from public.profiles p
  where p.id = uid;

  if coalesce(member_age, 0) < 18 then
    delete from public.current_club_memberships where user_id = uid;
    return;
  end if;

  -- Preserve every historical milestone reached from a completed workout.
  with definitions(exercise_name, threshold_kg) as (values
    ('Barbell Bench Press'::text, 40::numeric), ('Barbell Bench Press', 60), ('Barbell Bench Press', 80), ('Barbell Bench Press', 100), ('Barbell Bench Press', 120),
    ('Barbell Back Squat', 60), ('Barbell Back Squat', 100), ('Barbell Back Squat', 140), ('Barbell Back Squat', 180),
    ('Conventional Deadlift', 80), ('Conventional Deadlift', 120), ('Conventional Deadlift', 160), ('Conventional Deadlift', 200),
    ('Overhead Press', 30), ('Overhead Press', 50), ('Overhead Press', 70), ('Overhead Press', 90)
  ), completed_history as (
    select
      public.fithub_canonical_club_lift(ws.exercise_name) as exercise_name,
      ws.weight_kg::numeric as weight_kg,
      coalesce(ws.created_at, s.ended_at, s.started_at, now()) as achieved_at
    from public.workout_sets ws
    join public.workout_sessions s on s.id = ws.session_id and s.user_id = uid and s.completed = true
    where ws.user_id = uid
      and ws.weight_kg > 0
      and public.fithub_canonical_club_lift(ws.exercise_name) is not null
  ), reached as (
    select d.exercise_name, d.threshold_kg, min(h.achieved_at) as unlocked_at
    from definitions d
    join completed_history h on h.exercise_name = d.exercise_name and h.weight_kg >= d.threshold_kg
    group by d.exercise_name, d.threshold_kg
  )
  insert into public.club_unlocks(user_id, club_key, exercise_name, threshold_kg, source_pr_event_id, unlocked_at, last_qualified_at)
  select
    uid,
    regexp_replace(lower(r.exercise_name), '[^a-z0-9]+', '-', 'g') || '-' || r.threshold_kg::text || 'kg',
    r.exercise_name,
    r.threshold_kg,
    null,
    r.unlocked_at,
    now()
  from reached r
  on conflict on constraint club_unlocks_user_id_club_key_key do update
    set last_qualified_at = now(),
        unlocked_at = least(public.club_unlocks.unlocked_at, excluded.unlocked_at);

  -- Keep only the highest current club for each supported lift.
  with definitions(exercise_name, threshold_kg) as (values
    ('Barbell Bench Press'::text, 40::numeric), ('Barbell Bench Press', 60), ('Barbell Bench Press', 80), ('Barbell Bench Press', 100), ('Barbell Bench Press', 120),
    ('Barbell Back Squat', 60), ('Barbell Back Squat', 100), ('Barbell Back Squat', 140), ('Barbell Back Squat', 180),
    ('Conventional Deadlift', 80), ('Conventional Deadlift', 120), ('Conventional Deadlift', 160), ('Conventional Deadlift', 200),
    ('Overhead Press', 30), ('Overhead Press', 50), ('Overhead Press', 70), ('Overhead Press', 90)
  ), completed_history as (
    select
      public.fithub_canonical_club_lift(ws.exercise_name) as exercise_name,
      ws.weight_kg::numeric as weight_kg,
      coalesce(ws.created_at, s.ended_at, s.started_at, now()) as achieved_at
    from public.workout_sets ws
    join public.workout_sessions s on s.id = ws.session_id and s.user_id = uid and s.completed = true
    where ws.user_id = uid
      and ws.weight_kg > 0
      and public.fithub_canonical_club_lift(ws.exercise_name) is not null
  ), best_lifts as (
    select h.exercise_name, max(h.weight_kg) as max_weight
    from completed_history h
    group by h.exercise_name
  ), eligible as (
    select
      b.exercise_name,
      b.max_weight,
      max(d.threshold_kg) as threshold_kg
    from best_lifts b
    join definitions d on d.exercise_name = b.exercise_name and d.threshold_kg <= b.max_weight
    group by b.exercise_name, b.max_weight
  ), qualified as (
    select e.exercise_name, e.max_weight, e.threshold_kg, min(h.achieved_at) as achieved_at
    from eligible e
    join completed_history h on h.exercise_name = e.exercise_name and h.weight_kg >= e.threshold_kg
    group by e.exercise_name, e.max_weight, e.threshold_kg
  )
  insert into public.current_club_memberships(user_id, exercise_name, club_key, threshold_kg, qualifying_weight_kg, achieved_at, updated_at)
  select
    uid,
    q.exercise_name,
    regexp_replace(lower(q.exercise_name), '[^a-z0-9]+', '-', 'g') || '-' || q.threshold_kg::text || 'kg',
    q.threshold_kg,
    q.max_weight,
    q.achieved_at,
    now()
  from qualified q
  on conflict on constraint current_club_memberships_pkey do update
    set club_key = excluded.club_key,
        threshold_kg = excluded.threshold_kg,
        qualifying_weight_kg = excluded.qualifying_weight_kg,
        achieved_at = excluded.achieved_at,
        updated_at = now();

  delete from public.current_club_memberships current_membership
  where current_membership.user_id = uid
    and not exists (
      select 1
      from public.workout_sets ws
      join public.workout_sessions s on s.id = ws.session_id and s.user_id = uid and s.completed = true
      where ws.user_id = uid
        and public.fithub_canonical_club_lift(ws.exercise_name) = current_membership.exercise_name
        and ws.weight_kg >= current_membership.threshold_kg
    );

  return query
    select membership.exercise_name, membership.club_key, membership.threshold_kg,
           membership.qualifying_weight_kg, membership.achieved_at
    from public.current_club_memberships membership
    where membership.user_id = uid
    order by membership.exercise_name;
end;
$$;

grant execute on function public.fithub_canonical_club_lift(text) to authenticated;
grant execute on function public.refresh_my_current_clubs() to authenticated;

create or replace function public.get_my_current_clubs_with_counts()
returns table (
  exercise_name text,
  club_key text,
  threshold_kg numeric,
  qualifying_weight_kg numeric,
  achieved_at timestamptz,
  active_member_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select membership.exercise_name, membership.club_key, membership.threshold_kg,
         membership.qualifying_weight_kg, membership.achieved_at,
         (select count(*) from public.current_club_memberships other where other.club_key = membership.club_key)::bigint
  from public.current_club_memberships membership
  where membership.user_id = auth.uid()
  order by membership.exercise_name
$$;

grant execute on function public.get_my_current_clubs_with_counts() to authenticated;

commit;
