-- Player profiles, one per authenticated user.
-- Run in Supabase: SQL Editor → New query → paste → Run.

create type public.preferred_side as enum ('drive', 'backhand', 'either');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  -- Argentine padel category: 1 = 1ra (strongest) … 8 = 8va (beginner)
  category smallint not null check (category between 1 and 8),
  preferred_side public.preferred_side not null default 'either',
  whatsapp text check (whatsapp is null or char_length(whatsapp) between 8 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public player profile. WhatsApp is only shown to teammates of a full match (enforced in the app for v0.1).';

-- Keep updated_at fresh
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Row-level security: anyone signed in can read profiles (to see who is in a match);
-- each user can only create and edit their own.
alter table public.profiles enable row level security;

create policy "Signed-in users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
