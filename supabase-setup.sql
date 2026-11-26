-- AETHER CLIENT private approval portal
-- Run once in the Supabase SQL Editor. The bucket is private by design.

insert into storage.buckets (id,name,public)
values ('aether-downloads','aether-downloads',false)
on conflict (id) do update set public=false;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','approved','revoked')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Keep the SECURITY DEFINER helper outside the exposed public API schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_aether_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$;
revoke all on function private.is_aether_admin() from public, anon;
grant execute on function private.is_aether_admin() to authenticated;

create or replace function public.create_aether_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,email,status)
  values(new.id,coalesce(new.email,''),'pending')
  on conflict(id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists on_aether_user_created on auth.users;
create trigger on_aether_user_created after insert on auth.users
for each row execute procedure public.create_aether_profile();
-- Trigger execution does not require exposing the trigger function as an RPC.
revoke all on function public.create_aether_profile() from public, anon, authenticated;

drop policy if exists "members read own profile or owner reads all" on public.profiles;
create policy "members read own profile or owner reads all"
on public.profiles for select to authenticated
using ((id = (select auth.uid())) or (select private.is_aether_admin()));

drop policy if exists "owner updates member approvals" on public.profiles;
create policy "owner updates member approvals"
on public.profiles for update to authenticated
using ((select private.is_aether_admin()))
with check ((select private.is_aether_admin()));

-- Payment rows are private to their owner and the site administrator.
alter table if exists public.aether_payments enable row level security;
drop policy if exists "users read own aether payments or admin reads all" on public.aether_payments;
create policy "users read own aether payments or admin reads all"
on public.aether_payments for select to authenticated
using ((user_id = (select auth.uid())) or (select private.is_aether_admin()));

-- Only approved users and the administrator can download the private client package.
drop policy if exists "approved members can read client package" on storage.objects;
create policy "approved members can read client package"
on storage.objects for select to authenticated
using (
  bucket_id = 'aether-downloads'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.status = 'approved' or p.is_admin = true)
  )
);


-- AETHER Network: public player profiles, friend requests and online presence.
create table if not exists public.aether_social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,16}
update public.profiles set is_admin=true,status='approved'
where lower(email)=lower('gjha75363@gmail.com');
),
  display_name text not null default 'AETHER Player' check (char_length(display_name) between 1 and 32),
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.aether_social_profiles enable row level security;
grant select, insert on public.aether_social_profiles to authenticated;
grant update(username, display_name, avatar_url) on public.aether_social_profiles to authenticated;

create or replace function private.create_aether_social_profile()
returns trigger language plpgsql security definer set search_path = public
as $
begin
  insert into public.aether_social_profiles(user_id, username, display_name)
  values(new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 8), 'AETHER Player')
  on conflict (user_id) do nothing;
  return new;
end;
$;
revoke all on function private.create_aether_social_profile() from public, anon, authenticated;
drop trigger if exists on_aether_social_user_created on auth.users;
create trigger on_aether_social_user_created after insert on auth.users
for each row execute function private.create_aether_social_profile();

insert into public.aether_social_profiles(user_id, username, display_name)
select u.id, 'player_' || substr(replace(u.id::text, '-', ''), 1, 8), 'AETHER Player'
from auth.users u on conflict (user_id) do nothing;

drop policy if exists "signed-in users can find AETHER profiles" on public.aether_social_profiles;
create policy "signed-in users can find AETHER profiles"
on public.aether_social_profiles for select to authenticated using (true);
drop policy if exists "users create their own AETHER profile" on public.aether_social_profiles;
create policy "users create their own AETHER profile"
on public.aether_social_profiles for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists "users edit their own AETHER profile" on public.aether_social_profiles;
create policy "users edit their own AETHER profile"
on public.aether_social_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create table if not exists public.aether_friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aether_friend_pair_order check (user_a < user_b),
  constraint aether_friend_requester_in_pair check (requested_by = user_a or requested_by = user_b),
  constraint aether_friend_pair_unique unique(user_a, user_b)
);
alter table public.aether_friendships enable row level security;
grant select, insert, delete on public.aether_friendships to authenticated;
grant update(status, updated_at) on public.aether_friendships to authenticated;
create index if not exists aether_friendships_user_b_idx on public.aether_friendships(user_b);
create index if not exists aether_friendships_requested_by_idx on public.aether_friendships(requested_by);

drop policy if exists "users read their AETHER friendships" on public.aether_friendships;
create policy "users read their AETHER friendships"
on public.aether_friendships for select to authenticated
using (user_a = (select auth.uid()) or user_b = (select auth.uid()));
drop policy if exists "users send AETHER friend requests" on public.aether_friendships;
create policy "users send AETHER friend requests"
on public.aether_friendships for insert to authenticated
with check (requested_by = (select auth.uid()) and (user_a = (select auth.uid()) or user_b = (select auth.uid())) and status = 'pending');
drop policy if exists "recipients respond to AETHER friend requests" on public.aether_friendships;
create policy "recipients respond to AETHER friend requests"
on public.aether_friendships for update to authenticated
using ((user_a = (select auth.uid()) or user_b = (select auth.uid())) and requested_by <> (select auth.uid()) and status = 'pending')
with check ((user_a = (select auth.uid()) or user_b = (select auth.uid())) and requested_by <> (select auth.uid()) and status in ('accepted','declined'));
drop policy if exists "users remove AETHER friendships" on public.aether_friendships;
create policy "users remove AETHER friendships"
on public.aether_friendships for delete to authenticated
using (user_a = (select auth.uid()) or user_b = (select auth.uid()));

create table if not exists public.aether_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'offline' check (status in ('online','offline')),
  last_seen_at timestamptz not null default now()
);
alter table public.aether_presence enable row level security;
grant select, insert, update, delete on public.aether_presence to authenticated;
drop policy if exists "users see their friends presence" on public.aether_presence;
create policy "users see their friends presence"
on public.aether_presence for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.aether_friendships f
  where f.status = 'accepted'
    and ((f.user_a = (select auth.uid()) and f.user_b = aether_presence.user_id)
      or (f.user_b = (select auth.uid()) and f.user_a = aether_presence.user_id))
));
drop policy if exists "users publish their own presence" on public.aether_presence;
create policy "users publish their own presence"
on public.aether_presence for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists "users update their own presence" on public.aether_presence;
create policy "users update their own presence"
on public.aether_presence for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
drop policy if exists "users delete their own presence" on public.aether_presence;
create policy "users delete their own presence"
on public.aether_presence for delete to authenticated
using (user_id = (select auth.uid()));

do $
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='aether_friendships') then
    alter publication supabase_realtime add table public.aether_friendships;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='aether_presence') then
    alter publication supabase_realtime add table public.aether_presence;
  end if;
end $;

-- Owner bootstrap: run AFTER registering on the site with this exact email.
update public.profiles set is_admin=true,status='approved'
where lower(email)=lower('gjha75363@gmail.com');
