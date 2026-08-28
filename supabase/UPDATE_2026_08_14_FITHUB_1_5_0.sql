-- FitHub 1.5.0 additive migration
-- Designed to run AFTER the existing FitHub 1.4.0 / earlier migrations.
-- Do not rerun the original full schema.sql.

create extension if not exists pgcrypto;

create table if not exists public.user_app_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme_key text not null default 'fithubGraphite',
  accent_color text,
  weight_unit text not null default 'kg' check (weight_unit in ('kg','lb')),
  distance_unit text not null default 'km' check (distance_unit in ('km','mi')),
  hidden_features text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

create table if not exists public.supplement_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  supplement_name text not null check (char_length(trim(supplement_name)) between 1 and 80),
  reminder_hour int not null check (reminder_hour between 0 and 23),
  reminder_minute int not null check (reminder_minute between 0 and 59),
  enabled boolean not null default true,
  notification_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_split_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  label text not null check (char_length(trim(label)) between 1 and 80),
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(user_id, day_of_week)
);

create table if not exists public.daily_schedule_seen (
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null,
  seen_at timestamptz not null default now(),
  primary key(user_id, local_date)
);

create table if not exists public.pr_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_session_id uuid,
  workout_set_id uuid,
  exercise_name text not null,
  metric text not null check (metric in ('max_weight','reps_at_weight','distance','duration','pace','other')),
  value_numeric numeric not null,
  previous_value_numeric numeric,
  unit text not null,
  details jsonb not null default '{}'::jsonb,
  achieved_at timestamptz not null default now()
);

create index if not exists pr_events_user_achieved_idx
  on public.pr_events(user_id, achieved_at desc);

create index if not exists pr_events_user_exercise_idx
  on public.pr_events(user_id, lower(exercise_name), achieved_at desc);

create table if not exists public.club_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  club_key text not null,
  exercise_name text not null,
  threshold_kg numeric not null check (threshold_kg > 0),
  source_pr_event_id uuid references public.pr_events(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  unique(user_id, club_key)
);

create table if not exists public.community_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  creator_display_name text not null check (char_length(trim(creator_display_name)) between 1 and 100),
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text,
  target_type text not null default 'custom',
  target_value numeric not null check (target_value > 0),
  unit text not null default 'units',
  visibility text not null default 'private' check (visibility in ('public','friends','private')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_challenge_members (
  challenge_id uuid not null references public.community_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null default 'FitHub user',
  status text not null default 'joined' check (status in ('invited','joined','completed','declined')),
  progress_value numeric not null default 0 check (progress_value >= 0),
  joined_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(challenge_id, user_id)
);

-- Helper functions avoid recursive RLS lookups between challenges and memberships.
create or replace function public.is_community_challenge_member(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_challenge_members m
    where m.challenge_id = p_challenge_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_community_challenge_creator(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_challenges c
    where c.id = p_challenge_id
      and c.creator_id = auth.uid()
  );
$$;

revoke all on function public.is_community_challenge_member(uuid) from public;
revoke all on function public.is_community_challenge_creator(uuid) from public;
grant execute on function public.is_community_challenge_member(uuid) to authenticated;
grant execute on function public.is_community_challenge_creator(uuid) to authenticated;

alter table public.user_app_preferences enable row level security;
alter table public.supplement_reminders enable row level security;
alter table public.workout_split_days enable row level security;
alter table public.daily_schedule_seen enable row level security;
alter table public.pr_events enable row level security;
alter table public.club_unlocks enable row level security;
alter table public.community_challenges enable row level security;
alter table public.community_challenge_members enable row level security;

drop policy if exists "app preferences own" on public.user_app_preferences;
create policy "app preferences own" on public.user_app_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "supplement reminders own" on public.supplement_reminders;
create policy "supplement reminders own" on public.supplement_reminders
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "workout split own" on public.workout_split_days;
create policy "workout split own" on public.workout_split_days
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "daily schedule seen own" on public.daily_schedule_seen;
create policy "daily schedule seen own" on public.daily_schedule_seen
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "pr events own" on public.pr_events;
create policy "pr events own" on public.pr_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "club unlocks own" on public.club_unlocks;
create policy "club unlocks own" on public.club_unlocks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "challenge visible" on public.community_challenges;
create policy "challenge visible" on public.community_challenges
  for select to authenticated
  using (
    visibility = 'public'
    or creator_id = auth.uid()
    or public.is_community_challenge_member(id)
  );

drop policy if exists "challenge create own" on public.community_challenges;
create policy "challenge create own" on public.community_challenges
  for insert to authenticated
  with check (creator_id = auth.uid());

drop policy if exists "challenge update own" on public.community_challenges;
create policy "challenge update own" on public.community_challenges
  for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists "challenge delete own" on public.community_challenges;
create policy "challenge delete own" on public.community_challenges
  for delete to authenticated
  using (creator_id = auth.uid());

drop policy if exists "challenge membership visible" on public.community_challenge_members;
create policy "challenge membership visible" on public.community_challenge_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_community_challenge_creator(challenge_id)
  );

drop policy if exists "challenge membership insert" on public.community_challenge_members;
create policy "challenge membership insert" on public.community_challenge_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_community_challenge_creator(challenge_id)
  );

drop policy if exists "challenge membership update own" on public.community_challenge_members;
create policy "challenge membership update own" on public.community_challenge_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "challenge membership delete own" on public.community_challenge_members;
create policy "challenge membership delete own" on public.community_challenge_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_community_challenge_creator(challenge_id)
  );

-- Seed preferences for existing users lazily in the app via upsert.
