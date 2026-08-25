-- FitHub update migration: 2026-08-09
-- Safe to run on the existing FitHub Supabase project.

-- Remember the units users prefer when editing height/weight.
alter table public.profiles
  add column if not exists weight_unit text default 'kg' check (weight_unit in ('kg','lb'));

alter table public.profiles
  add column if not exists height_unit text default 'cm' check (height_unit in ('cm','in'));

-- Persist the user's chosen PR lifts across devices.
create table if not exists public.tracked_pr_exercises (
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_name)
);

alter table public.tracked_pr_exercises enable row level security;
drop policy if exists "tracked pr own" on public.tracked_pr_exercises;
create policy "tracked pr own" on public.tracked_pr_exercises
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Rich workout feed data for social-style workout posts.
create or replace function public.get_friend_feed_v2()
returns table(
  id uuid,
  user_id uuid,
  session_id uuid,
  username text,
  avatar_url text,
  summary text,
  created_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  exercise_count bigint,
  total_sets bigint,
  total_volume numeric,
  total_distance numeric,
  exercise_names text
)
language sql stable security definer set search_path = public as $$
  select
    wp.id,
    wp.user_id,
    wp.session_id,
    pp.username::text,
    pp.avatar_url,
    wp.summary,
    wp.created_at,
    ws.started_at,
    ws.ended_at,
    count(distinct wset.exercise_name) as exercise_count,
    count(wset.id) as total_sets,
    coalesce(sum(coalesce(wset.weight_kg,0) * coalesce(wset.reps,0)),0) as total_volume,
    coalesce(sum(coalesce(wset.distance_km,0)),0) as total_distance,
    coalesce(string_agg(distinct wset.exercise_name, ', '), wp.summary) as exercise_names
  from public.workout_posts wp
  join public.public_profiles pp on pp.user_id = wp.user_id
  join public.workout_sessions ws on ws.id = wp.session_id
  left join public.workout_sets wset on wset.session_id = wp.session_id
  where wp.user_id = auth.uid() or public.are_friends(auth.uid(), wp.user_id)
  group by wp.id, wp.user_id, wp.session_id, pp.username, pp.avatar_url, wp.summary, wp.created_at, ws.started_at, ws.ended_at
  order by wp.created_at desc
  limit 60;
$$;

grant execute on function public.get_friend_feed_v2() to authenticated;
