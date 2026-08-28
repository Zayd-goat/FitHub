-- FitHub 1.6.16 additive update
-- Run once in Supabase SQL Editor after the prior FitHub migrations.

begin;

alter table public.workout_sessions
  add column if not exists entry_source text not null default 'live',
  add column if not exists manual_notes text,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.workout_sessions
    add constraint workout_sessions_entry_source_check
    check (entry_source in ('live','manual','notification'));
exception when duplicate_object then null;
end $$;

alter table public.supplement_checkins
  add column if not exists status text not null default 'taken',
  add column if not exists recorded_time time,
  add column if not exists updated_at timestamptz not null default now();

alter table public.workout_posts
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.supplement_checkins
    add constraint supplement_checkins_status_check
    check (status in ('taken','missed','skipped'));
exception when duplicate_object then null;
end $$;

drop policy if exists posts_own_update on public.workout_posts;
create policy posts_own_update on public.workout_posts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists posts_own_delete on public.workout_posts;
create policy posts_own_delete on public.workout_posts
for delete to authenticated
using (user_id = auth.uid());

create table if not exists public.gym_invite_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.gym_invites(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (invite_id, recipient_id)
);

alter table public.gym_invite_notification_outbox enable row level security;

create or replace function public.queue_gym_invite_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.gym_invite_notification_outbox(invite_id, recipient_id, actor_id)
    values (new.id, new.recipient_id, new.sender_id)
    on conflict (invite_id, recipient_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists gym_invite_push_notification on public.gym_invites;
create trigger gym_invite_push_notification
after insert on public.gym_invites
for each row execute function public.queue_gym_invite_notification();

create index if not exists workout_sessions_user_day_idx
  on public.workout_sessions(user_id, ended_at desc)
  where completed = true;

create index if not exists supplement_checkins_user_day_status_idx
  on public.supplement_checkins(user_id, local_date desc, status);

create index if not exists gym_invite_outbox_pending_idx
  on public.gym_invite_notification_outbox(created_at)
  where processed_at is null;

create or replace function public.recalculate_my_workout_streak()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  workout_day date;
  previous_day date;
  latest_day date;
  next_streak integer := 0;
begin
  for workout_day in
    select distinct (coalesce(ended_at, started_at) at time zone 'UTC')::date
    from public.workout_sessions
    where user_id = auth.uid() and completed = true
    order by 1 desc
  loop
    if latest_day is null then
      latest_day := workout_day;
      previous_day := workout_day;
      next_streak := 1;
    elsif previous_day - workout_day = 1 then
      previous_day := workout_day;
      next_streak := next_streak + 1;
    else
      exit;
    end if;
  end loop;

  update public.profiles
  set last_workout_date = latest_day, workout_streak = next_streak
  where id = auth.uid();
  return next_streak;
end;
$$;

grant execute on function public.recalculate_my_workout_streak() to authenticated;

commit;
