-- Run in Supabase SQL Editor. Auth passwords and email OTPs are managed by Supabase Auth.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 first_name text not null default '',
 last_name text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.travel_categories (
 code text primary key, label text not null
);
insert into public.travel_categories(code,label) values
 ('HILLS','Hills & Mountains'),('BEACHES','Beaches'),('CITIES','Cities'),
 ('COUNTRYSIDE','Countryside'),('NATURE','Forests & Nature'),
 ('WILDLIFE','Wildlife & Safaris'),('HERITAGE','Heritage & Culture'),
 ('ADVENTURE','Adventure & Trekking'),('SPIRITUAL','Spiritual Destinations'),
 ('FOOD','Food & Local Experiences')
on conflict (code) do update set label=excluded.label;
create table if not exists public.user_travel_preferences (
 user_id uuid not null references auth.users(id) on delete cascade,
 preference_code text not null references public.travel_categories(code),
 created_at timestamptz not null default now(),
 primary key(user_id,preference_code)
);
create table if not exists public.user_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 temperature_unit text not null default 'C' check (temperature_unit in ('C','F')),
 preferred_radius integer not null default 10 check (preferred_radius in (5,10,20,30))
);
create table if not exists public.saved_places (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 place_name text not null,
 latitude double precision not null,
 longitude double precision not null,
 created_at timestamptz not null default now()
);
-- Supabase auth sign-up metadata is validated/saved server-side by trigger.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,first_name,last_name)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'first_name',''),80),left(coalesce(new.raw_user_meta_data->>'last_name',''),80))
 on conflict (id) do nothing;
 insert into public.user_preferences(user_id) values(new.id) on conflict do nothing;
 insert into public.user_travel_preferences(user_id,preference_code)
 select new.id, x.code from jsonb_array_elements_text(
   case when jsonb_typeof(new.raw_user_meta_data->'travel_preferences')='array'
   then new.raw_user_meta_data->'travel_preferences' else '[]'::jsonb end
 ) as raw(code)
 join public.travel_categories c on c.code=raw.code
 on conflict do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
 for each row execute function public.handle_new_user();
-- RLS
alter table public.profiles enable row level security;
alter table public.travel_categories enable row level security;
alter table public.user_travel_preferences enable row level security;
alter table public.user_preferences enable row level security;
alter table public.saved_places enable row level security;
create policy "Categories readable" on public.travel_categories for select to anon,authenticated using(true);
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "Update own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "Read own interests" on public.user_travel_preferences for select to authenticated using ((select auth.uid())=user_id);
create policy "Add own interests" on public.user_travel_preferences for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Remove own interests" on public.user_travel_preferences for delete to authenticated using ((select auth.uid())=user_id);
create policy "Read own settings" on public.user_preferences for select to authenticated using ((select auth.uid())=user_id);
create policy "Update own settings" on public.user_preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Read own saved places" on public.saved_places for select to authenticated using ((select auth.uid())=user_id);
create policy "Save own places" on public.saved_places for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Delete own saved places" on public.saved_places for delete to authenticated using ((select auth.uid())=user_id);
