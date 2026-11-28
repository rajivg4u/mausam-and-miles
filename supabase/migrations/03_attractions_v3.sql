begin;
alter table public.attractions add column if not exists is_verified boolean not null default false;
create table if not exists public.attraction_import_exclusions (source text not null, source_id text not null, primary key(source,source_id));
alter table public.attraction_import_exclusions enable row level security;
insert into public.attraction_import_exclusions select source,source_id from public.attractions where lower(name) in ('park town, chennai','park town assembly constituency') on conflict do nothing;
create index if not exists attractions_verified_coords_idx
  on public.attractions (latitude, longitude) where is_verified = true;

-- Recreate RPC: same parameters and response fields as the existing frontend.
create or replace function public.nearby_attractions(
  p_lat double precision,
  p_lon double precision,
  p_radius_km double precision,
  p_limit integer default 100
)
returns table (
  id bigint, name text, category text,
  latitude double precision, longitude double precision,
  distance double precision, website text, fee text
)
language sql stable
set search_path = ''
as $$
  with candidates as (
    select a.id, a.name, a.category, a.latitude, a.longitude,
      round((6371.0 * 2.0 * asin(least(1.0, sqrt(
        power(sin(radians(a.latitude - p_lat) / 2.0), 2) +
        cos(radians(p_lat)) * cos(radians(a.latitude)) *
        power(sin(radians(a.longitude - p_lon) / 2.0), 2)
      ))))::numeric, 1)::double precision as distance,
      a.website, a.fee,
      row_number() over (
        partition by lower(regexp_replace(a.name, '[^[:alnum:]]+', '', 'g')),
                     round(a.latitude::numeric, 2), round(a.longitude::numeric, 2)
        order by a.updated_at desc, a.id
      ) as duplicate_rank
    from public.attractions a
    where a.is_verified = true
      and a.latitude between p_lat - p_radius_km / 110.0 and p_lat + p_radius_km / 110.0
      and abs(a.longitude - p_lon) <= p_radius_km / greatest(1.0, 110.0 * abs(cos(radians(p_lat))))
  )
  select c.id, c.name, c.category, c.latitude, c.longitude,
         c.distance, c.website, c.fee
  from candidates c
  where c.duplicate_rank = 1 and c.distance <= p_radius_km
  order by c.distance asc, c.name asc
  limit least(greatest(p_limit, 1), 200);
$$;

revoke all on function public.nearby_attractions(double precision,double precision,double precision,integer)
  from public, anon, authenticated;
grant execute on function public.nearby_attractions(double precision,double precision,double precision,integer)
  to service_role;


commit;
