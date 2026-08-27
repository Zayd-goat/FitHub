-- FitHub 1.6.0 queued-feature additive migration.
-- Run after UPDATE_2026_08_14_FITHUB_1_6_0_ADDITIVE.sql.
-- Existing 1.5.0 tables are extended, never recreated.
create extension if not exists pgcrypto;

create table if not exists public.supplement_checkins(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 reminder_id uuid not null references public.supplement_reminders(id) on delete cascade,
 local_date date not null, taken_at timestamptz not null default now(), source text not null default 'in_app'
 check(source in('notification','in_app','manual')), unique(user_id,reminder_id,local_date)
);
alter table public.supplement_checkins enable row level security;
drop policy if exists supplement_checkins_own on public.supplement_checkins;
create policy supplement_checkins_own on public.supplement_checkins for all to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());

alter table public.club_unlocks add column if not exists last_qualified_at timestamptz not null default now();
create or replace view public.club_active_member_counts with (security_invoker=true) as
 select club_key,count(distinct user_id)::bigint active_member_count
 from public.club_unlocks where last_qualified_at >= now()-interval '90 days' group by club_key;
grant select on public.club_active_member_counts to authenticated;
create or replace function public.get_my_clubs_with_active_counts()
returns table(id uuid,club_key text,exercise_name text,threshold_kg numeric,unlocked_at timestamptz,active_member_count bigint)
language sql stable security definer set search_path=public as $$
 select u.id,u.club_key,u.exercise_name,u.threshold_kg,u.unlocked_at,
 (select count(distinct x.user_id) from club_unlocks x where x.club_key=u.club_key and x.last_qualified_at>=now()-interval '90 days')
 from club_unlocks u where u.user_id=auth.uid() order by u.unlocked_at desc $$;
grant execute on function public.get_my_clubs_with_active_counts() to authenticated;

create table if not exists public.friend_notification_preferences(
 user_id uuid not null references auth.users(id) on delete cascade,
 friend_id uuid not null references auth.users(id) on delete cascade,
 post_notifications boolean not null default false, pr_notifications boolean not null default false,
 updated_at timestamptz not null default now(), primary key(user_id,friend_id), check(user_id<>friend_id)
);
alter table public.friend_notification_preferences enable row level security;
drop policy if exists friend_notification_preferences_own on public.friend_notification_preferences;
create policy friend_notification_preferences_own on public.friend_notification_preferences for all to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.push_tokens(
 user_id uuid not null references auth.users(id) on delete cascade, token text not null,
 platform text not null, enabled boolean not null default true, updated_at timestamptz not null default now(),
 primary key(user_id,token)
);
alter table public.push_tokens enable row level security;
drop policy if exists push_tokens_own on public.push_tokens;
create policy push_tokens_own on public.push_tokens for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Private delivery queue consumed by the server-side notification Edge Function.
create table if not exists public.friend_notification_outbox(
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade, post_id uuid not null,
 notification_type text not null check(notification_type in('post','pr')), created_at timestamptz not null default now(), processed_at timestamptz
);
alter table public.friend_notification_outbox enable row level security;

create or replace function public.queue_friend_post_notification() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into friend_notification_outbox(recipient_id,actor_id,post_id,notification_type)
 select p.user_id,new.user_id,new.id,case when coalesce(new.caption,'') ilike '%new pr%' then 'pr' else 'post' end
 from friend_notification_preferences p where p.friend_id=new.user_id and
 ((coalesce(new.caption,'') ilike '%new pr%' and p.pr_notifications) or (coalesce(new.caption,'') not ilike '%new pr%' and p.post_notifications));
 return new;
end $$;
drop trigger if exists workout_post_friend_notifications on public.workout_posts;
create trigger workout_post_friend_notifications after insert on public.workout_posts for each row execute function public.queue_friend_post_notification();
