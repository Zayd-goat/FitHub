-- FitHub 1.6.18 additive update
-- Run once after the prior FitHub migrations. This migration preserves existing data.

begin;

create extension if not exists pgcrypto;

-- Store a birthday once; age remains a compatibility field and is refreshed from it.
alter table public.profiles add column if not exists date_of_birth date;

create or replace function public.fithub_age_from_birth(p_date date)
returns integer
language sql
stable
set search_path = public
as $$
  select case when p_date is null then null else extract(year from age(current_date, p_date))::integer end
$$;

create or replace function public.sync_profile_age_from_birth()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  calculated integer;
begin
  if new.date_of_birth is not null then
    calculated := public.fithub_age_from_birth(new.date_of_birth);
    if new.date_of_birth > current_date then raise exception 'Birthday cannot be in the future'; end if;
    if calculated < 13 then raise exception 'FitHub accounts require a minimum age of 13'; end if;
    if calculated > 100 then raise exception 'Check the birthday and try again'; end if;
    new.age := calculated;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_age_from_birth on public.profiles;
create trigger profiles_sync_age_from_birth
before insert or update of date_of_birth on public.profiles
for each row execute function public.sync_profile_age_from_birth();

update public.profiles
set age = public.fithub_age_from_birth(date_of_birth)
where date_of_birth is not null
  and age is distinct from public.fithub_age_from_birth(date_of_birth);

-- Durable, private in-app notification inbox. Push delivery is an enhancement, not the only record.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  notification_type text not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  acted_at timestamptz,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.user_notifications add constraint user_notifications_type_check
    check (notification_type in ('gym_invite','gym_invite_response','friend_request','friend_post','friend_pr','system'));
exception when duplicate_object then null;
end $$;

create unique index if not exists user_notifications_dedupe_idx
  on public.user_notifications(user_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists user_notifications_unread_idx
  on public.user_notifications(user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;
drop policy if exists user_notifications_own_read on public.user_notifications;
create policy user_notifications_own_read on public.user_notifications
for select to authenticated using (user_id = auth.uid());
drop policy if exists user_notifications_own_update on public.user_notifications;
create policy user_notifications_own_update on public.user_notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists user_notifications_own_delete on public.user_notifications;
create policy user_notifications_own_delete on public.user_notifications
for delete to authenticated using (user_id = auth.uid());

grant select, update, delete on public.user_notifications to authenticated;

create or replace function public.fithub_actor_name(p_actor uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select username::text from public.public_profiles where user_id = p_actor), 'A FitHub friend')
$$;

create or replace function public.create_gym_invite_inbox_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  actor_name := public.fithub_actor_name(new.sender_id);
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.user_notifications(user_id, actor_id, notification_type, title, body, data, dedupe_key)
    values (
      new.recipient_id,
      new.sender_id,
      'gym_invite',
      actor_name || ' invited you to the gym',
      concat_ws(' • ', nullif(new.workout_name, ''), nullif(new.gym_name, ''), to_char(new.session_at at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC'),
      jsonb_build_object('invite_id', new.id::text, 'sender_id', new.sender_id::text),
      'gym-invite:' || new.id::text
    ) on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('accepted','declined','cancelled') then
    update public.user_notifications
      set read_at = coalesce(read_at, now()), acted_at = coalesce(acted_at, now())
      where user_id = new.recipient_id and dedupe_key = 'gym-invite:' || new.id::text;
    if new.status in ('accepted','declined') then
      insert into public.user_notifications(user_id, actor_id, notification_type, title, body, data, dedupe_key)
      values (
        new.sender_id,
        new.recipient_id,
        'gym_invite_response',
        public.fithub_actor_name(new.recipient_id) || ' ' || new.status || ' your gym invite',
        coalesce(nullif(new.workout_name, ''), 'Open Shared Gym Sessions for details.'),
        jsonb_build_object('invite_id', new.id::text, 'status', new.status),
        'gym-response:' || new.id::text || ':' || new.status
      ) on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists gym_invite_inbox_notification on public.gym_invites;
create trigger gym_invite_inbox_notification
after insert or update on public.gym_invites
for each row execute function public.create_gym_invite_inbox_notification();

create or replace function public.create_friend_request_inbox_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.user_notifications(user_id, actor_id, notification_type, title, body, data, dedupe_key)
    values (
      new.addressee_id,
      new.requester_id,
      'friend_request',
      public.fithub_actor_name(new.requester_id) || ' sent you a friend request',
      'Accept or decline the request in FitHub.',
      jsonb_build_object('request_id', new.id::text, 'requester_id', new.requester_id::text),
      'friend-request:' || new.id::text
    ) on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('accepted','declined') then
    update public.user_notifications
      set read_at = coalesce(read_at, now()), acted_at = coalesce(acted_at, now())
      where user_id = new.addressee_id and dedupe_key = 'friend-request:' || new.id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists friend_request_inbox_notification on public.friend_requests;
create trigger friend_request_inbox_notification
after insert or update on public.friend_requests
for each row execute function public.create_friend_request_inbox_notification();

-- Mirror opt-in friend post/PR delivery into the in-app inbox.
create or replace function public.mirror_friend_outbox_to_inbox()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kind text;
  actor_name text;
begin
  kind := case when new.notification_type = 'pr' then 'friend_pr' else 'friend_post' end;
  actor_name := public.fithub_actor_name(new.actor_id);
  insert into public.user_notifications(user_id, actor_id, notification_type, title, body, data, dedupe_key)
  values (
    new.recipient_id,
    new.actor_id,
    kind,
    case when kind = 'friend_pr' then actor_name || ' set a new PR' else actor_name || ' shared a workout' end,
    'Tap to open your friend feed.',
    jsonb_build_object('post_id', new.post_id::text),
    'friend-outbox:' || new.id::text
  ) on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
end;
$$;

drop trigger if exists friend_outbox_inbox_notification on public.friend_notification_outbox;
create trigger friend_outbox_inbox_notification
after insert on public.friend_notification_outbox
for each row execute function public.mirror_friend_outbox_to_inbox();

-- Existing pending items become visible immediately after this migration.
insert into public.user_notifications(user_id, actor_id, notification_type, title, body, data, dedupe_key)
select gi.recipient_id, gi.sender_id, 'gym_invite', public.fithub_actor_name(gi.sender_id) || ' invited you to the gym',
       concat_ws(' • ', nullif(gi.workout_name, ''), nullif(gi.gym_name, ''), to_char(gi.session_at at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC'),
       jsonb_build_object('invite_id', gi.id::text, 'sender_id', gi.sender_id::text), 'gym-invite:' || gi.id::text
from public.gym_invites gi
where gi.status = 'pending' and gi.session_at > now()
on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

insert into public.user_notifications(user_id, actor_id, notification_type, title, body, data, dedupe_key)
select fr.addressee_id, fr.requester_id, 'friend_request', public.fithub_actor_name(fr.requester_id) || ' sent you a friend request',
       'Accept or decline the request in FitHub.', jsonb_build_object('request_id', fr.id::text, 'requester_id', fr.requester_id::text), 'friend-request:' || fr.id::text
from public.friend_requests fr
where fr.status = 'pending'
on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

alter table if exists public.friend_notification_outbox
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_error text;
alter table if exists public.gym_invite_notification_outbox
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_error text;

do $$ begin
  alter publication supabase_realtime add table public.user_notifications;
exception when duplicate_object then null;
end $$;

commit;
