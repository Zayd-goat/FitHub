-- FitHub Supabase schema
-- Run this once in Supabase Dashboard -> SQL Editor on a new project.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  username citext not null unique,
  avatar_url text,
  age int check (age is null or age between 13 and 100),
  fitness_level text check (fitness_level is null or fitness_level in ('new','occasional','regular')),
  weight_kg numeric,
  height_cm numeric,
  gender text,
  activity_level text,
  goal text,
  workout_days_target int not null default 3 check (workout_days_target between 1 and 7),
  maintenance_calories int,
  protein_target_g int,
  onboarding_complete boolean not null default false,
  login_streak int not null default 0,
  workout_streak int not null default 0,
  tokens int not null default 0,
  last_checkin_date date,
  last_workout_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  username citext not null unique,
  avatar_url text,
  login_streak int not null default 0,
  workout_streak int not null default 0,
  tokens int not null default 0
);

create table if not exists public.daily_checkins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, checkin_date)
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  serving text not null default '1 serving',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  source text not null default 'manual',
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name text not null,
  serving text not null,
  servings numeric not null default 1,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  logged_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  category text not null default 'Custom',
  equipment text not null default 'Custom',
  metric_type text not null check (metric_type in ('strength','distance','time')),
  icon_emoji text not null default '💪',
  rep_min int,
  rep_max int,
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  summary text,
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  set_number int not null default 1,
  weight_kg numeric,
  reps int,
  distance_km numeric,
  duration_min numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.public_profiles(user_id) on delete cascade,
  addressee_id uuid not null references public.public_profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.friendships (
  user_a uuid not null references public.public_profiles(user_id) on delete cascade,
  user_b uuid not null references public.public_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a <> user_b)
);

create table if not exists public.workout_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.public_profiles(user_id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.workout_posts(id) on delete cascade,
  user_id uuid not null references public.public_profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.public_profiles(user_id) on delete cascade,
  title text not null,
  description text not null default '',
  metric text not null check (metric in ('workouts','active_days','distance','strength_sessions')),
  target_value numeric not null check (target_value > 0),
  unit text not null,
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  preset boolean not null default false,
  visibility text not null default 'friends' check (visibility in ('friends','public')),
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.public_profiles(user_id) on delete cascade,
  progress numeric not null default 0,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key(user_id, achievement_key)
);

-- ---------- Helpers ----------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.friendships f
    where (f.user_a = a and f.user_b = b) or (f.user_a = b and f.user_b = a)
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  wanted_username citext;
begin
  wanted_username := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'user_' || substring(new.id::text, 1, 8));
  insert into public.profiles(id,email,username) values(new.id,new.email,wanted_username);
  insert into public.public_profiles(user_id,username) values(new.id,wanted_username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.sync_public_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  insert into public.public_profiles(user_id,username,avatar_url,login_streak,workout_streak,tokens)
  values(new.id,new.username,new.avatar_url,new.login_streak,new.workout_streak,new.tokens)
  on conflict(user_id) do update set
    username=excluded.username, avatar_url=excluded.avatar_url,
    login_streak=excluded.login_streak, workout_streak=excluded.workout_streak, tokens=excluded.tokens;
  return new;
end;
$$;

drop trigger if exists sync_profile_public on public.profiles;
create trigger sync_profile_public before update on public.profiles for each row execute procedure public.sync_public_profile();

create or replace function public.find_profile(search_text text)
returns table(user_id uuid, username text, avatar_url text, login_streak int, workout_streak int, tokens int)
language sql stable security definer set search_path = public as $$
  select pp.user_id, pp.username::text, pp.avatar_url, pp.login_streak, pp.workout_streak, pp.tokens
  from public.public_profiles pp
  join public.profiles p on p.id = pp.user_id
  where lower(pp.username::text) like '%' || lower(trim(search_text)) || '%'
     or lower(p.email::text) = lower(trim(search_text))
  order by pp.username
  limit 20;
$$;

grant execute on function public.find_profile(text) to authenticated;

create or replace function public.accept_friend_request(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.friend_requests%rowtype; a uuid; b uuid;
begin
  select * into r from public.friend_requests where id=request_id and addressee_id=auth.uid() and status='pending';
  if not found then raise exception 'Friend request not found'; end if;
  update public.friend_requests set status='accepted' where id=request_id;
  a := least(r.requester_id::text, r.addressee_id::text)::uuid;
  b := greatest(r.requester_id::text, r.addressee_id::text)::uuid;
  insert into public.friendships(user_a,user_b) values(a,b) on conflict do nothing;
end;
$$;
grant execute on function public.accept_friend_request(uuid) to authenticated;

create or replace function public.get_my_friends()
returns table(user_id uuid, username text, avatar_url text, login_streak int, workout_streak int, tokens int)
language sql stable security definer set search_path = public as $$
  select pp.user_id, pp.username::text, pp.avatar_url, pp.login_streak, pp.workout_streak, pp.tokens
  from public.friendships f
  join public.public_profiles pp on pp.user_id = case when f.user_a=auth.uid() then f.user_b else f.user_a end
  where f.user_a=auth.uid() or f.user_b=auth.uid()
  order by pp.username;
$$;
grant execute on function public.get_my_friends() to authenticated;

create or replace function public.get_friend_feed()
returns table(id uuid, user_id uuid, username text, avatar_url text, summary text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select wp.id, wp.user_id, pp.username::text, pp.avatar_url, wp.summary, wp.created_at
  from public.workout_posts wp join public.public_profiles pp on pp.user_id=wp.user_id
  where wp.user_id=auth.uid() or public.are_friends(auth.uid(), wp.user_id)
  order by wp.created_at desc limit 60;
$$;
grant execute on function public.get_friend_feed() to authenticated;

create or replace function public.get_visible_challenges()
returns table(id uuid, title text, description text, metric text, target_value numeric, unit text, end_date timestamptz, preset boolean, joined boolean, my_progress numeric, participant_count bigint)
language sql stable security definer set search_path = public as $$
  select c.id,c.title,c.description,c.metric,c.target_value,c.unit,c.end_date,c.preset,
    exists(select 1 from public.challenge_participants cp where cp.challenge_id=c.id and cp.user_id=auth.uid()) as joined,
    coalesce((select cp.progress from public.challenge_participants cp where cp.challenge_id=c.id and cp.user_id=auth.uid()),0) as my_progress,
    (select count(*) from public.challenge_participants cp2 where cp2.challenge_id=c.id) as participant_count
  from public.challenges c
  where c.end_date > now() and (
    c.preset or c.visibility='public' or c.created_by=auth.uid() or public.are_friends(auth.uid(),c.created_by)
    or exists(select 1 from public.challenge_participants cp3 where cp3.challenge_id=c.id and cp3.user_id=auth.uid())
  )
  order by c.preset desc, c.created_at desc;
$$;
grant execute on function public.get_visible_challenges() to authenticated;

create or replace function public.apply_workout_to_challenges(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.workout_sessions where id=p_session_id and user_id=auth.uid() and completed=true) then
    raise exception 'Workout not found';
  end if;

  update public.challenge_participants cp
  set progress = case c.metric
    when 'workouts' then (
      select count(*) from public.workout_sessions ws
      where ws.user_id=auth.uid() and ws.completed=true and coalesce(ws.ended_at,ws.created_at) between c.start_date and c.end_date
    )
    when 'active_days' then (
      select count(distinct date(coalesce(ws.ended_at,ws.created_at))) from public.workout_sessions ws
      where ws.user_id=auth.uid() and ws.completed=true and coalesce(ws.ended_at,ws.created_at) between c.start_date and c.end_date
    )
    when 'distance' then (
      select coalesce(sum(wset.distance_km),0) from public.workout_sets wset
      join public.workout_sessions ws on ws.id=wset.session_id
      where ws.user_id=auth.uid() and ws.completed=true and coalesce(ws.ended_at,ws.created_at) between c.start_date and c.end_date
    )
    when 'strength_sessions' then (
      select count(distinct ws.id) from public.workout_sessions ws
      join public.workout_sets wset on wset.session_id=ws.id and wset.weight_kg is not null
      where ws.user_id=auth.uid() and ws.completed=true and coalesce(ws.ended_at,ws.created_at) between c.start_date and c.end_date
    ) else cp.progress end
  from public.challenges c
  where cp.challenge_id=c.id and cp.user_id=auth.uid() and now() <= c.end_date;
end;
$$;
grant execute on function public.apply_workout_to_challenges(uuid) to authenticated;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.public_profiles enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.foods enable row level security;
alter table public.food_logs enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.workout_posts enable row level security;
alter table public.comments enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.user_achievements enable row level security;

create policy "profiles own read" on public.profiles for select to authenticated using(id=auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "public profiles read" on public.public_profiles for select to authenticated using(true);

create policy "checkins own" on public.daily_checkins for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "foods visible" on public.foods for select to authenticated using(public or owner_id=auth.uid());
create policy "foods own insert" on public.foods for insert to authenticated with check(owner_id=auth.uid());
create policy "foods own update" on public.foods for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "food logs own" on public.food_logs for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "exercises visible" on public.exercises for select to authenticated using(public or owner_id=auth.uid());
create policy "exercises own insert" on public.exercises for insert to authenticated with check(owner_id=auth.uid());
create policy "exercises own update" on public.exercises for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "sessions own" on public.workout_sessions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "sets own" on public.workout_sets for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy "friend requests participants read" on public.friend_requests for select to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid());
create policy "friend requests send" on public.friend_requests for insert to authenticated with check(requester_id=auth.uid());
create policy "friendships participants read" on public.friendships for select to authenticated using(user_a=auth.uid() or user_b=auth.uid());

create policy "posts friends read" on public.workout_posts for select to authenticated using(user_id=auth.uid() or public.are_friends(auth.uid(),user_id));
create policy "posts own insert" on public.workout_posts for insert to authenticated with check(user_id=auth.uid());
create policy "comments friends read" on public.comments for select to authenticated using(exists(select 1 from public.workout_posts p where p.id=post_id and (p.user_id=auth.uid() or public.are_friends(auth.uid(),p.user_id))));
create policy "comments add" on public.comments for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.workout_posts p where p.id=post_id and (p.user_id=auth.uid() or public.are_friends(auth.uid(),p.user_id))));

create policy "challenges visible" on public.challenges for select to authenticated using(preset or visibility='public' or created_by=auth.uid() or public.are_friends(auth.uid(),created_by));
create policy "challenges create" on public.challenges for insert to authenticated with check(created_by=auth.uid() and preset=false);
create policy "participants visible" on public.challenge_participants for select to authenticated using(true);
create policy "participants self join" on public.challenge_participants for insert to authenticated with check(user_id=auth.uid());
create policy "achievements own" on public.user_achievements for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- ---------- Avatar storage ----------
insert into storage.buckets(id,name,public) values('avatars','avatars',true) on conflict(id) do update set public=true;
create policy "avatar public read" on storage.objects for select using(bucket_id='avatars');
create policy "avatar own insert" on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatar own update" on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

-- ---------- Realtime social updates ----------
-- These tables power cross-device friend streaks, feeds, comments and challenge progress.
alter publication supabase_realtime add table public.public_profiles;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.workout_posts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.challenge_participants;

-- ---------- Preset challenges ----------
insert into public.challenges(created_by,title,description,metric,target_value,unit,start_date,end_date,preset,visibility)
select null,'10-Workout Team','Complete ten workout sessions together.','workouts',10,'workouts',now(),now()+interval '10 years',true,'public'
where not exists(select 1 from public.challenges where preset=true and title='10-Workout Team');
insert into public.challenges(created_by,title,description,metric,target_value,unit,start_date,end_date,preset,visibility)
select null,'25 km Together','Accumulate 25 km of running or cycling.','distance',25,'km',now(),now()+interval '10 years',true,'public'
where not exists(select 1 from public.challenges where preset=true and title='25 km Together');
insert into public.challenges(created_by,title,description,metric,target_value,unit,start_date,end_date,preset,visibility)
select null,'10 Active Days','Complete workouts on ten different days.','active_days',10,'days',now(),now()+interval '10 years',true,'public'
where not exists(select 1 from public.challenges where preset=true and title='10 Active Days');
insert into public.challenges(created_by,title,description,metric,target_value,unit,start_date,end_date,preset,visibility)
select null,'Strength 8','Complete eight resistance-training sessions.','strength_sessions',8,'sessions',now(),now()+interval '10 years',true,'public'
where not exists(select 1 from public.challenges where preset=true and title='Strength 8');
