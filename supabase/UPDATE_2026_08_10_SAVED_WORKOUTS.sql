-- FitHub 1.2.2 migration: saved workout templates
-- Safe to run on the existing FitHub Supabase project.

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_templates enable row level security;

drop policy if exists "workout templates own" on public.workout_templates;
create policy "workout templates own" on public.workout_templates
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists workout_templates_user_updated_idx
  on public.workout_templates(user_id, updated_at desc);
