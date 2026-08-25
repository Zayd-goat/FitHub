-- FitHub 1.6.0 additive migration.
-- Prerequisite: UPDATE_2026_08_14_FITHUB_1_5_0.sql has already run.
-- Do not rerun schema.sql. This file intentionally does not recreate 1.5.0 objects.
create extension if not exists pgcrypto;

alter table public.food_logs add column if not exists meal_type text default 'snacks'
  check (meal_type in ('breakfast','lunch','dinner','snacks'));
alter table public.food_logs add column if not exists fibre_g numeric default 0;
alter table public.food_logs add column if not exists serving_id text;
alter table public.food_logs add column if not exists provider_food_id text;
alter table public.food_logs add column if not exists client_request_id uuid;
create unique index if not exists food_logs_user_client_request_uidx on public.food_logs(user_id,client_request_id) where client_request_id is not null;
alter table public.foods add column if not exists fibre_g numeric default 0;
alter table public.foods add column if not exists barcode text;
alter table public.foods add column if not exists provider_food_id text;
alter table public.foods add column if not exists provider_serving_id text;

create table if not exists public.nutrition_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 calorie_target numeric, protein_target_g numeric, carbs_target_g numeric, fat_target_g numeric, fibre_target_g numeric,
 water_target_ml integer, enabled_goal_keys text[] not null default '{}', updated_at timestamptz not null default now()
);
create table if not exists public.food_favourites(
 user_id uuid references auth.users(id) on delete cascade, food_key text not null, food_name text not null,
 provider_food_id text, serving_id text, created_at timestamptz not null default now(), primary key(user_id,food_key)
);
create table if not exists public.saved_meals(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, meal_type text, created_at timestamptz not null default now()
);
create table if not exists public.saved_meal_items(
 id uuid primary key default gen_random_uuid(), meal_id uuid not null references public.saved_meals(id) on delete cascade,
 food_name text not null, serving text not null, servings numeric not null default 1,
 calories numeric default 0, protein_g numeric default 0, carbs_g numeric default 0, fat_g numeric default 0, fibre_g numeric default 0,
 provider_food_id text, serving_id text
);
create table if not exists public.recipes(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, servings numeric not null default 1 check(servings>0), instructions text, created_at timestamptz not null default now()
);
create table if not exists public.recipe_items(
 id uuid primary key default gen_random_uuid(), recipe_id uuid not null references public.recipes(id) on delete cascade,
 food_name text not null, serving text not null, quantity numeric not null default 1,
 calories numeric default 0, protein_g numeric default 0, carbs_g numeric default 0, fat_g numeric default 0, fibre_g numeric default 0,
 provider_food_id text, serving_id text
);
create table if not exists public.water_logs(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 amount_ml integer not null check(amount_ml>0 and amount_ml<=5000), logged_at timestamptz not null default now(),
 client_request_id uuid
);
create unique index if not exists water_logs_user_client_uidx on public.water_logs(user_id,client_request_id) where client_request_id is not null;

create table if not exists public.daily_steps(
 user_id uuid not null references auth.users(id) on delete cascade, local_date date not null, steps integer not null default 0 check(steps>=0),
 source text not null default 'hardware_pedometer', synced_at timestamptz not null default now(), primary key(user_id,local_date)
);
create table if not exists public.step_groups(
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references auth.users(id) on delete cascade,
 name text not null, visibility text not null default 'private' check(visibility='private'), created_at timestamptz not null default now()
);
create table if not exists public.step_group_members(
 group_id uuid references public.step_groups(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
 invited_by uuid references auth.users(id), status text not null default 'pending' check(status in('pending','accepted','declined')),
 joined_at timestamptz, primary key(group_id,user_id)
);

create table if not exists public.shared_gym_sessions(
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Gym session', planned_for timestamptz, status text not null default 'invited',
 created_at timestamptz not null default now()
);
create table if not exists public.shared_gym_participants(
 shared_session_id uuid references public.shared_gym_sessions(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade, invite_status text not null default 'pending',
 workout_session_id uuid references public.workout_sessions(id) on delete set null,
 publish_consent boolean not null default false, completed_at timestamptz, primary key(shared_session_id,user_id)
);
create table if not exists public.shared_workout_posts(
 id uuid primary key default gen_random_uuid(), shared_session_id uuid unique not null references public.shared_gym_sessions(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade, caption text, photo_url text, published_at timestamptz
);

create table if not exists public.cardio_equipment_sessions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 workout_session_id uuid references public.workout_sessions(id) on delete set null, connection_type text not null check(connection_type in('ftms','manual')),
 machine_name text, ftms_machine_type text, duration_seconds integer, speed_kph numeric, distance_km numeric,
 incline_percent numeric, resistance_level numeric, pace_seconds_per_km integer, watts numeric, cadence_rpm numeric,
 floors integer, calories numeric, calories_source text check(calories_source in('machine_reported','fithub_estimate',null)),
 heart_rate_bpm integer, capabilities text[] not null default '{}', created_at timestamptz not null default now()
);

create table if not exists public.activity_streaks(
 user_id uuid references auth.users(id) on delete cascade, streak_type text not null,
 current_count integer not null default 0, best_count integer not null default 0, last_qualified_date date,
 rule jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key(user_id,streak_type)
);

alter table public.nutrition_preferences enable row level security;
alter table public.food_favourites enable row level security;
alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.water_logs enable row level security;
alter table public.daily_steps enable row level security;
alter table public.step_groups enable row level security;
alter table public.step_group_members enable row level security;
alter table public.shared_gym_sessions enable row level security;
alter table public.shared_gym_participants enable row level security;
alter table public.shared_workout_posts enable row level security;
alter table public.cardio_equipment_sessions enable row level security;
alter table public.activity_streaks enable row level security;

-- Idempotent policy creation for private user-owned records.
do $$ declare t text; begin
 foreach t in array array['nutrition_preferences','food_favourites','saved_meals','recipes','water_logs','daily_steps','cardio_equipment_sessions','activity_streaks']
 loop
   if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_own') then
     execute format('create policy %I on public.%I for all using (user_id=auth.uid()) with check (user_id=auth.uid())',t||'_own',t);
   end if;
 end loop;
end $$;
do $$ begin
 if not exists(select 1 from pg_policies where tablename='saved_meal_items' and policyname='saved_meal_items_own') then
  create policy saved_meal_items_own on public.saved_meal_items for all using(exists(select 1 from public.saved_meals m where m.id=meal_id and m.user_id=auth.uid())) with check(exists(select 1 from public.saved_meals m where m.id=meal_id and m.user_id=auth.uid()));
 end if;
 if not exists(select 1 from pg_policies where tablename='recipe_items' and policyname='recipe_items_own') then
  create policy recipe_items_own on public.recipe_items for all using(exists(select 1 from public.recipes r where r.id=recipe_id and r.user_id=auth.uid())) with check(exists(select 1 from public.recipes r where r.id=recipe_id and r.user_id=auth.uid()));
 end if;
end $$;
create or replace function public.is_step_group_member(g uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from step_group_members m where m.group_id=g and m.user_id=auth.uid() and m.status='accepted')
 or exists(select 1 from step_groups x where x.id=g and x.creator_id=auth.uid()) $$;
do $$ begin
 if not exists(select 1 from pg_policies where tablename='daily_steps' and policyname='daily_steps_group_shared') then
  create policy daily_steps_group_shared on public.daily_steps for select using(exists(
   select 1 from public.step_group_members me join public.step_group_members them on them.group_id=me.group_id
   where me.user_id=auth.uid() and me.status='accepted' and them.user_id=daily_steps.user_id and them.status='accepted'));
 end if;
 if not exists(select 1 from pg_policies where tablename='step_groups' and policyname='step_groups_private') then
  create policy step_groups_private on public.step_groups for all using(creator_id=auth.uid() or public.is_step_group_member(id)) with check(creator_id=auth.uid());
 end if;
 if not exists(select 1 from pg_policies where tablename='step_group_members' and policyname='step_members_private') then
  create policy step_members_private on public.step_group_members for select using(user_id=auth.uid() or public.is_step_group_member(group_id));
  create policy step_members_invite on public.step_group_members for insert with check(invited_by=auth.uid() and public.is_step_group_member(group_id));
  create policy step_members_reply on public.step_group_members for update using(user_id=auth.uid());
  create policy step_members_leave on public.step_group_members for delete using(user_id=auth.uid());
 end if;
end $$;
-- Shared gym records are visible only to creator/participants; publication still requires every included participant's consent.
create or replace function public.is_shared_gym_participant(s uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from shared_gym_sessions g where g.id=s and g.creator_id=auth.uid())
 or exists(select 1 from shared_gym_participants p where p.shared_session_id=s and p.user_id=auth.uid()) $$;
create or replace function public.can_publish_shared_post(s uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_shared_gym_participant(s)
 and not exists(select 1 from shared_gym_participants p where p.shared_session_id=s and (p.invite_status<>'accepted' or not p.publish_consent)) $$;
do $$ begin
 if not exists(select 1 from pg_policies where tablename='shared_gym_sessions' and policyname='shared_gym_private') then
  create policy shared_gym_private on public.shared_gym_sessions for select using(public.is_shared_gym_participant(id));
  create policy shared_gym_create on public.shared_gym_sessions for insert with check(creator_id=auth.uid());
  create policy shared_gym_owner_update on public.shared_gym_sessions for update using(creator_id=auth.uid());
 end if;
 if not exists(select 1 from pg_policies where tablename='shared_gym_participants' and policyname='shared_gym_participants_private') then
  create policy shared_gym_participants_private on public.shared_gym_participants for select using(public.is_shared_gym_participant(shared_session_id));
  create policy shared_gym_participants_invite on public.shared_gym_participants for insert with check(public.is_shared_gym_participant(shared_session_id));
  create policy shared_gym_participants_reply on public.shared_gym_participants for update using(user_id=auth.uid());
 end if;
 if not exists(select 1 from pg_policies where tablename='shared_workout_posts' and policyname='shared_posts_private') then
  create policy shared_posts_private on public.shared_workout_posts for select using(public.is_shared_gym_participant(shared_session_id));
  create policy shared_posts_create on public.shared_workout_posts for insert with check(created_by=auth.uid() and public.can_publish_shared_post(shared_session_id));
 end if;
end $$;
