-- AETHER CLIENT private access portal — run in Supabase SQL Editor.
-- 1) Create a private Storage bucket named: aether-downloads
-- 2) Run this SQL.
-- 3) Replace YOUR_OWNER_EMAIL_HERE with the email you will use to sign up.
-- 4) After signing up once, run the OWNER BOOTSTRAP query at the bottom.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','approved','revoked')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_aether_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_admin = true);
$$;

create or replace function public.create_aether_profile()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,email,status)
  values(new.id, coalesce(new.email,''), 'pending')
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists on_aether_user_created on auth.users;
create trigger on_aether_user_created
after insert on auth.users
for each row execute procedure public.create_aether_profile();

drop policy if exists "members read own profile or owner reads all" on public.profiles;
create policy "members read own profile or owner reads all"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_aether_admin());

drop policy if exists "owner updates member approvals" on public.profiles;
create policy "owner updates member approvals"
on public.profiles for update to authenticated
using (public.is_aether_admin())
with check (public.is_aether_admin());

-- Authenticated users can never create or edit their own approval/admin flags.
-- The signup trigger creates pending profiles. No client-side insert policy is granted.

-- Storage policies: bucket must be PRIVATE.
drop policy if exists "approved members can read client package" on storage.objects;
create policy "approved members can read client package"
on storage.objects for select to authenticated
using (
  bucket_id = 'aether-downloads'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.status = 'approved' or p.is_admin = true)
  )
);

-- OWNER BOOTSTRAP (run only AFTER you have signed up with your owner email):
-- Run this AFTER signing up on the website with gjha4456@gmail.com:
-- update public.profiles set is_admin = true, status = 'approved'
-- where lower(email) = lower('gjha4456@gmail.com');
