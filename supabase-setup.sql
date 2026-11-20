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

create or replace function public.is_aether_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and is_admin=true); $$;

create or replace function public.create_aether_profile()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  insert into public.profiles(id,email,status) values(new.id,coalesce(new.email,''),'pending')
  on conflict(id) do update set email=excluded.email;
  return new;
end; $$;

drop trigger if exists on_aether_user_created on auth.users;
create trigger on_aether_user_created after insert on auth.users
for each row execute procedure public.create_aether_profile();

drop policy if exists "members read own profile or owner reads all" on public.profiles;
create policy "members read own profile or owner reads all" on public.profiles for select to authenticated
using (id=auth.uid() or public.is_aether_admin());

drop policy if exists "owner updates member approvals" on public.profiles;
create policy "owner updates member approvals" on public.profiles for update to authenticated
using (public.is_aether_admin()) with check (public.is_aether_admin());

drop policy if exists "approved members can read client package" on storage.objects;
create policy "approved members can read client package" on storage.objects for select to authenticated
using (bucket_id='aether-downloads' and exists(
  select 1 from public.profiles p where p.id=auth.uid() and (p.status='approved' or p.is_admin=true)
));

-- Owner bootstrap: run AFTER registering on the site with this exact email.
update public.profiles set is_admin=true,status='approved'
where lower(email)=lower('gjha75363@gmail.com');
