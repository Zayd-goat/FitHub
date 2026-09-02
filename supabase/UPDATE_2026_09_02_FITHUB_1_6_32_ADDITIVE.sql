-- FitHub 1.6.32 additive update.
-- Run after the earlier FitHub migrations. This is safe to run more than once.
-- It enables real notification-backed invitations from Shared Gym Sessions and
-- archives supplement reminders without deleting their tracking history.

begin;

alter table public.supplement_reminders
  add column if not exists archived_at timestamptz;

create index if not exists supplement_reminders_active_user_time_idx
  on public.supplement_reminders(user_id, reminder_hour, reminder_minute)
  where archived_at is null;

alter table public.gym_invites
  add column if not exists shared_session_id uuid
  references public.shared_gym_sessions(id) on delete cascade;

create index if not exists gym_invites_shared_session_idx
  on public.gym_invites(shared_session_id, created_at desc)
  where shared_session_id is not null;

-- A leader can invite another friend into an existing shared room. The normal
-- friendship check remains in place, and a non-leader cannot attach an invite
-- to somebody else's session.
drop policy if exists "gym invites sender insert" on public.gym_invites;
create policy "gym invites sender insert" on public.gym_invites
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and recipient_id <> auth.uid()
    and public.are_friends(auth.uid(), recipient_id)
    and (
      shared_session_id is null
      or public.is_shared_gym_leader(shared_session_id)
    )
  );

-- Keep invite ownership and room links immutable. Recipients may only respond;
-- senders may adjust details or cancel. Service-role maintenance remains
-- possible because auth.uid() is null for trusted backend jobs.
create or replace function public.enforce_gym_invite_update()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    new.updated_at := now();
    return new;
  end if;

  if new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.shared_session_id is distinct from old.shared_session_id then
    raise exception 'Invite participants and shared room cannot be changed';
  end if;

  if actor = old.recipient_id then
    if new.session_at is distinct from old.session_at
       or new.gym_name is distinct from old.gym_name
       or new.workout_name is distinct from old.workout_name
       or new.note is distinct from old.note
       or new.status not in ('accepted','declined') then
      raise exception 'Invite recipients can only accept or decline';
    end if;
  elsif actor = old.sender_id then
    if new.status is distinct from old.status and new.status <> 'cancelled' then
      raise exception 'Invite senders can only cancel an invite response';
    end if;
  else
    raise exception 'You are not part of this gym invite';
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists enforce_gym_invite_update on public.gym_invites;
create trigger enforce_gym_invite_update
before update on public.gym_invites
for each row execute function public.enforce_gym_invite_update();

create or replace function public.sync_gym_invite_to_shared_session()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  linked_session uuid;
  base_invite boolean;
begin
  if tg_op = 'INSERT' then
    if new.shared_session_id is not null then
      linked_session := new.shared_session_id;
      if not public.is_shared_gym_leader(linked_session) then
        raise exception 'Only the workout leader can invite another participant';
      end if;

      insert into public.shared_gym_participants(
        shared_session_id, user_id, invite_status, workout_mode, publish_consent
      ) values (
        linked_session, new.recipient_id, 'pending', 'undecided', false
      )
      on conflict(shared_session_id,user_id) do update
        set invite_status='pending',
            workout_mode='undecided',
            publish_consent=false,
            completed_at=null,
            workout_session_id=null,
            synced_at=null,
            left_sync_at=null;
    else
      insert into public.shared_gym_sessions(
        gym_invite_id, creator_id, leader_id, title, planned_for, status
      ) values (
        new.id,
        new.sender_id,
        new.sender_id,
        coalesce(nullif(new.workout_name,''),nullif(new.gym_name,''),'Gym session'),
        new.session_at,
        'invited'
      )
      on conflict(gym_invite_id) do update
        set planned_for=excluded.planned_for,
            title=excluded.title
      returning id into linked_session;

      insert into public.shared_gym_participants(
        shared_session_id,user_id,invite_status,workout_mode,publish_consent
      ) values
        (linked_session,new.sender_id,'accepted','undecided',false),
        (linked_session,new.recipient_id,'pending','undecided',false)
      on conflict(shared_session_id,user_id) do nothing;
    end if;
  else
    select coalesce(
      new.shared_session_id,
      (select id from public.shared_gym_sessions where gym_invite_id=new.id)
    ) into linked_session;

    if linked_session is not null then
      update public.shared_gym_participants
        set invite_status=case
              when new.status='accepted' then 'accepted'
              when new.status in ('declined','cancelled') then 'declined'
              else 'pending'
            end
        where shared_session_id=linked_session
          and user_id=new.recipient_id;

      select exists(
        select 1 from public.shared_gym_sessions
        where id=linked_session and gym_invite_id=new.id
      ) into base_invite;

      if base_invite then
        update public.shared_gym_sessions
          set planned_for=new.session_at,
              title=coalesce(nullif(new.workout_name,''),nullif(new.gym_name,''),title),
              status=case
                when new.status='accepted' then 'ready'
                when new.status in ('declined','cancelled') then new.status
                else 'invited'
              end
          where id=linked_session;
      elsif new.status='accepted' then
        update public.shared_gym_sessions
          set status=case when status='invited' then 'ready' else status end
          where id=linked_session;
      end if;
    end if;
  end if;

  return new;
end $$;

revoke execute on function public.sync_gym_invite_to_shared_session() from public;
revoke execute on function public.enforce_gym_invite_update() from public;

commit;
