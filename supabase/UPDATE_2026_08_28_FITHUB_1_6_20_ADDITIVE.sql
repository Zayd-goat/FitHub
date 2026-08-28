-- FitHub 1.6.20 additive update
-- Run once after UPDATE_2026_08_26_FITHUB_1_6_19_ADDITIVE.sql.
-- Keeps existing users, workouts, club history, invites and notifications.

begin;

-- The helper deliberately uses OUT names that cannot collide with table columns.
-- This fixes: column reference "club_key" is ambiguous.
create or replace function public.refresh_my_current_clubs_v2()
returns table (
  out_exercise_name text,
  out_club_key text,
  out_threshold_kg numeric,
  out_qualifying_weight_kg numeric,
  out_achieved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member_age integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select coalesce(
    case when p.date_of_birth is not null then public.fithub_age_from_birth(p.date_of_birth) end,
    p.age,
    0
  ) into v_member_age
  from public.profiles p
  where p.id = v_uid;

  if coalesce(v_member_age, 0) < 18 then
    delete from public.current_club_memberships membership where membership.user_id = v_uid;
    return;
  end if;

  with definitions(exercise_name, threshold_kg) as (values
    ('Barbell Bench Press'::text, 40::numeric), ('Barbell Bench Press', 60), ('Barbell Bench Press', 80), ('Barbell Bench Press', 100), ('Barbell Bench Press', 120),
    ('Barbell Back Squat', 60), ('Barbell Back Squat', 100), ('Barbell Back Squat', 140), ('Barbell Back Squat', 180),
    ('Conventional Deadlift', 80), ('Conventional Deadlift', 120), ('Conventional Deadlift', 160), ('Conventional Deadlift', 200),
    ('Overhead Press', 30), ('Overhead Press', 50), ('Overhead Press', 70), ('Overhead Press', 90)
  ), completed_history as (
    select public.fithub_canonical_club_lift(ws.exercise_name) as exercise_name,
           ws.weight_kg::numeric as weight_kg,
           coalesce(ws.created_at, session.ended_at, session.started_at, now()) as achieved_at
    from public.workout_sets ws
    join public.workout_sessions session on session.id = ws.session_id and session.user_id = v_uid and session.completed = true
    where ws.user_id = v_uid and ws.weight_kg > 0
      and public.fithub_canonical_club_lift(ws.exercise_name) is not null
  ), reached as (
    select definition.exercise_name, definition.threshold_kg, min(history.achieved_at) as unlocked_at
    from definitions definition
    join completed_history history on history.exercise_name = definition.exercise_name and history.weight_kg >= definition.threshold_kg
    group by definition.exercise_name, definition.threshold_kg
  )
  insert into public.club_unlocks(user_id, club_key, exercise_name, threshold_kg, source_pr_event_id, unlocked_at, last_qualified_at)
  select v_uid,
         regexp_replace(lower(reached.exercise_name), '[^a-z0-9]+', '-', 'g') || '-' || reached.threshold_kg::text || 'kg',
         reached.exercise_name, reached.threshold_kg, null, reached.unlocked_at, now()
  from reached
  on conflict on constraint club_unlocks_user_id_club_key_key do update
    set last_qualified_at = now(),
        unlocked_at = least(public.club_unlocks.unlocked_at, excluded.unlocked_at);

  with definitions(exercise_name, threshold_kg) as (values
    ('Barbell Bench Press'::text, 40::numeric), ('Barbell Bench Press', 60), ('Barbell Bench Press', 80), ('Barbell Bench Press', 100), ('Barbell Bench Press', 120),
    ('Barbell Back Squat', 60), ('Barbell Back Squat', 100), ('Barbell Back Squat', 140), ('Barbell Back Squat', 180),
    ('Conventional Deadlift', 80), ('Conventional Deadlift', 120), ('Conventional Deadlift', 160), ('Conventional Deadlift', 200),
    ('Overhead Press', 30), ('Overhead Press', 50), ('Overhead Press', 70), ('Overhead Press', 90)
  ), completed_history as (
    select public.fithub_canonical_club_lift(ws.exercise_name) as exercise_name,
           ws.weight_kg::numeric as weight_kg,
           coalesce(ws.created_at, session.ended_at, session.started_at, now()) as achieved_at
    from public.workout_sets ws
    join public.workout_sessions session on session.id = ws.session_id and session.user_id = v_uid and session.completed = true
    where ws.user_id = v_uid and ws.weight_kg > 0
      and public.fithub_canonical_club_lift(ws.exercise_name) is not null
  ), best_lifts as (
    select history.exercise_name, max(history.weight_kg) as max_weight
    from completed_history history group by history.exercise_name
  ), eligible as (
    select best.exercise_name, best.max_weight, max(definition.threshold_kg) as threshold_kg
    from best_lifts best
    join definitions definition on definition.exercise_name = best.exercise_name and definition.threshold_kg <= best.max_weight
    group by best.exercise_name, best.max_weight
  ), qualified as (
    select eligible.exercise_name, eligible.max_weight, eligible.threshold_kg, min(history.achieved_at) as achieved_at
    from eligible
    join completed_history history on history.exercise_name = eligible.exercise_name and history.weight_kg >= eligible.threshold_kg
    group by eligible.exercise_name, eligible.max_weight, eligible.threshold_kg
  )
  insert into public.current_club_memberships(user_id, exercise_name, club_key, threshold_kg, qualifying_weight_kg, achieved_at, updated_at)
  select v_uid, qualified.exercise_name,
         regexp_replace(lower(qualified.exercise_name), '[^a-z0-9]+', '-', 'g') || '-' || qualified.threshold_kg::text || 'kg',
         qualified.threshold_kg, qualified.max_weight, qualified.achieved_at, now()
  from qualified
  on conflict on constraint current_club_memberships_pkey do update
    set club_key = excluded.club_key,
        threshold_kg = excluded.threshold_kg,
        qualifying_weight_kg = excluded.qualifying_weight_kg,
        achieved_at = excluded.achieved_at,
        updated_at = now();

  delete from public.current_club_memberships membership
  where membership.user_id = v_uid
    and not exists (
      select 1 from public.workout_sets ws
      join public.workout_sessions session on session.id = ws.session_id and session.user_id = v_uid and session.completed = true
      where ws.user_id = v_uid
        and public.fithub_canonical_club_lift(ws.exercise_name) = membership.exercise_name
        and ws.weight_kg >= membership.threshold_kg
    );

  return query
    select membership.exercise_name, membership.club_key, membership.threshold_kg,
           membership.qualifying_weight_kg, membership.achieved_at
    from public.current_club_memberships membership
    where membership.user_id = v_uid
    order by membership.exercise_name;
end;
$$;

create or replace function public.refresh_my_current_clubs()
returns table (
  exercise_name text,
  club_key text,
  threshold_kg numeric,
  qualifying_weight_kg numeric,
  achieved_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select result.out_exercise_name, result.out_club_key, result.out_threshold_kg,
         result.out_qualifying_weight_kg, result.out_achieved_at
  from public.refresh_my_current_clubs_v2() result
$$;

revoke all on function public.refresh_my_current_clubs_v2() from public;
grant execute on function public.refresh_my_current_clubs_v2() to authenticated;
grant execute on function public.refresh_my_current_clubs() to authenticated;

-- Queue both the original invite and the recipient's later response as separate pushes.
alter table public.gym_invite_notification_outbox
  add column if not exists notification_kind text not null default 'invite',
  add column if not exists response_status text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gym_invite_outbox_kind_check') then
    alter table public.gym_invite_notification_outbox
      add constraint gym_invite_outbox_kind_check check (notification_kind in ('invite','response'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'gym_invite_outbox_response_check') then
    alter table public.gym_invite_notification_outbox
      add constraint gym_invite_outbox_response_check check (response_status is null or response_status in ('accepted','declined'));
  end if;
end $$;

create or replace function public.queue_gym_invite_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.gym_invite_notification_outbox(invite_id, recipient_id, actor_id, notification_kind, response_status)
    values (new.id, new.recipient_id, new.sender_id, 'invite', null)
    on conflict (invite_id, recipient_id) do update
      set actor_id = excluded.actor_id, notification_kind = 'invite', response_status = null,
          processed_at = null, retry_count = 0, last_error = null, created_at = now();
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('accepted','declined') then
    insert into public.gym_invite_notification_outbox(invite_id, recipient_id, actor_id, notification_kind, response_status)
    values (new.id, new.sender_id, new.recipient_id, 'response', new.status)
    on conflict (invite_id, recipient_id) do update
      set actor_id = excluded.actor_id, notification_kind = 'response', response_status = excluded.response_status,
          processed_at = null, retry_count = 0, last_error = null, created_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists gym_invite_push_notification on public.gym_invites;
create trigger gym_invite_push_notification
after insert or update on public.gym_invites
for each row execute function public.queue_gym_invite_notification();

grant usage on schema public to service_role;
grant select, update on public.gym_invite_notification_outbox to service_role;
grant select on public.gym_invites, public.public_profiles, public.push_tokens to service_role;

commit;
