-- Public-facing identity, filled in by the onboarding dialog after first sign-in.
-- A missing row means the user hasn't finished onboarding.
-- Nothing reads other users' profiles yet; community features will add a public view
-- that only exposes the email when show_email is true.

create table public.profiles (
  id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 20),
  show_email   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
