-- FitHub 1.6.4 additive migration. Run after the existing 1.6.0/1.6.1 migrations.
create extension if not exists pgcrypto;

-- Post engagement visibility and comment moderation.
alter table public.workout_posts add column if not exists hide_like_count boolean not null default false;
alter table public.workout_posts add column if not exists hide_comment_count boolean not null default false;
alter table public.comments add column if not exists hidden_by_post_owner boolean not null default false;
alter table public.comments add column if not exists hidden_at timestamptz;

create table if not exists public.post_reactions(
 post_id uuid not null references public.workout_posts(id) on delete cascade,
 user_id uuid not null references public.public_profiles(user_id) on delete cascade,
 reaction text not null default 'like' check(reaction in('like')),
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
alter table public.post_reactions enable row level security;
drop policy if exists post_reactions_visible on public.post_reactions;
create policy post_reactions_visible on public.post_reactions for select to authenticated using(
 exists(select 1 from public.workout_posts p where p.id=post_id and (p.user_id=auth.uid() or public.are_friends(auth.uid(),p.user_id)))
);
drop policy if exists post_reactions_own_insert on public.post_reactions;
create policy post_reactions_own_insert on public.post_reactions for insert to authenticated with check(user_id=auth.uid());
drop policy if exists post_reactions_own_delete on public.post_reactions;
create policy post_reactions_own_delete on public.post_reactions for delete to authenticated using(user_id=auth.uid());

drop policy if exists comments_author_or_owner_delete on public.comments;
create policy comments_author_or_owner_delete on public.comments for delete to authenticated using(
 user_id=auth.uid() or exists(select 1 from public.workout_posts p where p.id=post_id and p.user_id=auth.uid())
);
drop policy if exists comments_post_owner_moderate on public.comments;
create policy comments_post_owner_moderate on public.comments for update to authenticated using(
 exists(select 1 from public.workout_posts p where p.id=post_id and p.user_id=auth.uid())
) with check(
 exists(select 1 from public.workout_posts p where p.id=post_id and p.user_id=auth.uid())
);

-- Only the highest current club per supported lift counts as active membership.
create table if not exists public.current_club_memberships(
 user_id uuid not null references auth.users(id) on delete cascade,
 exercise_name text not null,
 club_key text not null,
 threshold_kg numeric not null check(threshold_kg>0),
 qualifying_weight_kg numeric not null check(qualifying_weight_kg>=threshold_kg),
 achieved_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,exercise_name),
 unique(user_id,club_key)
);
alter table public.current_club_memberships enable row level security;
drop policy if exists current_clubs_read on public.current_club_memberships;
create policy current_clubs_read on public.current_club_memberships for select to authenticated using(user_id = auth.uid());
drop policy if exists current_clubs_own_write on public.current_club_memberships;
create policy current_clubs_own_write on public.current_club_memberships for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.refresh_my_current_clubs()
returns table(exercise_name text,club_key text,threshold_kg numeric,qualifying_weight_kg numeric,achieved_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if coalesce((select age from profiles where id=uid),0)<18 then
   delete from current_club_memberships where user_id=uid;
   return;
 end if;
 with definitions(exercise_name,pattern,threshold_kg) as (values
   ('Barbell Bench Press','(barbell bench press|bench press)',40::numeric),('Barbell Bench Press','(barbell bench press|bench press)',60),('Barbell Bench Press','(barbell bench press|bench press)',80),('Barbell Bench Press','(barbell bench press|bench press)',100),('Barbell Bench Press','(barbell bench press|bench press)',120),
   ('Barbell Back Squat','(back squat|barbell squat)',60),('Barbell Back Squat','(back squat|barbell squat)',100),('Barbell Back Squat','(back squat|barbell squat)',140),('Barbell Back Squat','(back squat|barbell squat)',180),
   ('Conventional Deadlift','deadlift',80),('Conventional Deadlift','deadlift',120),('Conventional Deadlift','deadlift',160),('Conventional Deadlift','deadlift',200),
   ('Overhead Press','(overhead press|military press)',30),('Overhead Press','(overhead press|military press)',50),('Overhead Press','(overhead press|military press)',70),('Overhead Press','(overhead press|military press)',90)
 ), best_lifts as (
   select d.exercise_name,max(ws.weight_kg)::numeric max_weight
   from definitions d join workout_sets ws on ws.user_id=uid and lower(ws.exercise_name)~d.pattern
   join workout_sessions s on s.id=ws.session_id and s.user_id=uid and s.completed=true
   where ws.weight_kg>0 group by d.exercise_name
 ), eligible as (
   select b.exercise_name,b.max_weight,max(d.threshold_kg) threshold_kg
   from best_lifts b join definitions d on d.exercise_name=b.exercise_name and d.threshold_kg<=b.max_weight
   group by b.exercise_name,b.max_weight
 )
 insert into current_club_memberships(user_id,exercise_name,club_key,threshold_kg,qualifying_weight_kg,achieved_at,updated_at)
 select uid,e.exercise_name,regexp_replace(lower(e.exercise_name),'[^a-z0-9]+','-','g')||'-'||e.threshold_kg::text||'kg',e.threshold_kg,e.max_weight,now(),now() from eligible e
 on conflict(user_id,exercise_name) do update set club_key=excluded.club_key,threshold_kg=excluded.threshold_kg,qualifying_weight_kg=excluded.qualifying_weight_kg,achieved_at=case when current_club_memberships.threshold_kg<>excluded.threshold_kg then now() else current_club_memberships.achieved_at end,updated_at=now();

 delete from current_club_memberships c where c.user_id=uid and not exists(
  select 1 from workout_sets ws join workout_sessions s on s.id=ws.session_id and s.completed=true
  where ws.user_id=uid and ws.weight_kg>=c.threshold_kg and lower(ws.exercise_name)~case c.exercise_name when 'Barbell Bench Press' then '(barbell bench press|bench press)' when 'Barbell Back Squat' then '(back squat|barbell squat)' when 'Conventional Deadlift' then 'deadlift' else '(overhead press|military press)' end
 );
 return query select c.exercise_name,c.club_key,c.threshold_kg,c.qualifying_weight_kg,c.achieved_at from current_club_memberships c where c.user_id=uid order by c.exercise_name;
end $$;
grant execute on function public.refresh_my_current_clubs() to authenticated;

create or replace function public.get_my_current_clubs_with_counts()
returns table(exercise_name text,club_key text,threshold_kg numeric,qualifying_weight_kg numeric,achieved_at timestamptz,active_member_count bigint)
language sql stable security definer set search_path=public as $$
 select c.exercise_name,c.club_key,c.threshold_kg,c.qualifying_weight_kg,c.achieved_at,
  (select count(*) from current_club_memberships x where x.club_key=c.club_key)::bigint
 from current_club_memberships c where c.user_id=auth.uid() order by c.exercise_name
$$;
grant execute on function public.get_my_current_clubs_with_counts() to authenticated;
