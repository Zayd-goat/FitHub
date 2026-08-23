-- FitHub 1.6.1 additive migration. Run after all prior 1.5.0/1.6.0 migrations.
-- Step records are retained for recovery but the app no longer exposes or writes them.
create extension if not exists pgcrypto;

alter table public.supplement_reminders add column if not exists color_hex text not null default '#2ECC71' check(color_hex ~ '^#[0-9A-Fa-f]{6}$');
create table if not exists public.supplement_reschedules(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 reminder_id uuid not null references public.supplement_reminders(id) on delete cascade,
 scheduled_for timestamptz not null,created_at timestamptz not null default now()
);
alter table public.supplement_reschedules enable row level security;
drop policy if exists supplement_reschedules_own on public.supplement_reschedules;
create policy supplement_reschedules_own on public.supplement_reschedules for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

alter table public.community_challenges add column if not exists difficulty smallint not null default 3 check(difficulty between 1 and 5);
alter table public.community_challenges add column if not exists difficulty_source text not null default 'creator' check(difficulty_source in('creator','official'));
alter table public.community_challenges add column if not exists official_month date;
alter table public.community_challenges add column if not exists archived_at timestamptz;
create index if not exists community_challenges_official_month_idx on public.community_challenges(official_month);

-- Developer monthly challenge publishing: insert official rows with difficulty_source='official',
-- official_month set to the first day of the month, and a safe age range.
alter table public.community_challenges add column if not exists minimum_age smallint not null default 13;
alter table public.community_challenges add column if not exists maximum_age smallint;
create or replace function public.archive_expired_official_challenges() returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin update community_challenges set archived_at=coalesce(archived_at,now()) where difficulty_source='official' and ends_at<now() and archived_at is null;get diagnostics n=row_count;return n;end $$;

drop policy if exists posts_own_delete on public.workout_posts;
create policy posts_own_delete on public.workout_posts for delete to authenticated using(user_id=auth.uid());

-- Preserve removed step feature data, but mark the retirement in a server-visible flag.
create table if not exists public.fithub_feature_status(feature_key text primary key,enabled boolean not null,retired_at timestamptz,notes text);
insert into public.fithub_feature_status(feature_key,enabled,retired_at,notes) values('steps',false,now(),'Removed from FitHub 1.6.1; historical rows retained') on conflict(feature_key) do update set enabled=false,retired_at=coalesce(fithub_feature_status.retired_at,excluded.retired_at),notes=excluded.notes;
alter table public.fithub_feature_status enable row level security;
drop policy if exists fithub_feature_status_read on public.fithub_feature_status;
create policy fithub_feature_status_read on public.fithub_feature_status for select to authenticated using(true);
