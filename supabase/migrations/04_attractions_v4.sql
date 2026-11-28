begin;
alter table public.attractions add column if not exists source_revision bigint;
create table if not exists public.attraction_import_jobs (
 tile_x integer not null, tile_y integer not null,
 status text not null default 'pending' check(status in ('pending','running','completed','failed')),
 refreshed_at timestamptz, available_at timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid, attempts integer not null default 0,
 last_error text, cursor_data jsonb not null default '{}'::jsonb,
 primary key(tile_x,tile_y)
);
alter table public.attraction_import_jobs enable row level security;
revoke all on public.attraction_import_jobs from anon,authenticated;
grant all on public.attraction_import_jobs to service_role;
-- Fixed 0.05-degree grid, shared across searches; India only.
create or replace function public.enqueue_attraction_tiles(p_lat float8,p_lon float8,p_radius_km float8)
returns integer language plpgsql set search_path='' as $$
declare n integer;
begin
 if p_lat is null or p_lon is null or p_radius_km is null or p_lat not between 6 and 38 or p_lon not between 68 and 98 or p_radius_km not in (5,10,20,30) then return 0; end if;
 insert into public.attraction_import_jobs(tile_x,tile_y)
 select x,y from generate_series(floor((p_lon-p_radius_km/(110*cos(radians(p_lat))))/0.05)::int, floor((p_lon+p_radius_km/(110*cos(radians(p_lat))))/0.05)::int) x
 cross join generate_series(floor((p_lat-p_radius_km/110)/0.05)::int,floor((p_lat+p_radius_km/110)/0.05)::int) y
 on conflict(tile_x,tile_y) do update set status='pending',available_at=now(),attempts=0,cursor_data='{}',last_error=null
 where attraction_import_jobs.status='completed' and attraction_import_jobs.refreshed_at < now()-interval '30 days';
 get diagnostics n=row_count; return n;
end $$;
create or replace function public.claim_attraction_tile()
returns setof public.attraction_import_jobs language sql set search_path='' as $$
 with candidate as (select tile_x,tile_y from public.attraction_import_jobs where ((status in ('pending','failed') and available_at<=now()) or (status='running' and lease_until<now())) order by available_at,tile_x,tile_y limit 1 for update skip locked)
 update public.attraction_import_jobs j set status='running',lease_until=now()+interval '3 minutes',lease_token=gen_random_uuid(),attempts=j.attempts+1 from candidate c where j.tile_x=c.tile_x and j.tile_y=c.tile_y returning j.*;
$$;
-- Apply a page atomically, only if the worker still owns its lease.
create or replace function public.finish_attraction_page(p_x int,p_y int,p_token uuid,p_rows jsonb,p_cursor jsonb,p_error text default null)
returns boolean language plpgsql set search_path='' as $$
begin
 perform 1 from public.attraction_import_jobs where tile_x=p_x and tile_y=p_y and lease_token=p_token and status='running' and lease_until>now() for update;
 if not found then return false; end if;
 if p_error is not null then
 update public.attraction_import_jobs set status='failed',available_at=now()+interval '1 hour',last_error=left(p_error,500),lease_token=null,lease_until=null where tile_x=p_x and tile_y=p_y;
 return true; end if;
 insert into public.attractions(source,source_id,name,category,latitude,longitude,website,is_verified,source_revision)
 select 'wikipedia',r.source_id,r.name,r.category,r.latitude,r.longitude,r.website,true,r.source_revision
 from jsonb_to_recordset(p_rows) r(source_id text,name text,category text,latitude float8,longitude float8,website text,source_revision bigint)
 where not exists(select 1 from public.attraction_import_exclusions e where e.source='wikipedia' and e.source_id=r.source_id)
 on conflict(source,source_id) do update set name=excluded.name,latitude=excluded.latitude,longitude=excluded.longitude,website=excluded.website,source_revision=excluded.source_revision,updated_at=now()
 where attractions.is_verified and (attractions.source_revision is null or attractions.source_revision<excluded.source_revision);
 -- Preserve existing verification and categories, including manual decisions.
 update public.attraction_import_jobs set status=case when p_cursor is null then 'completed' else 'pending' end,
 refreshed_at=case when p_cursor is null then now() else refreshed_at end,cursor_data=coalesce(p_cursor,'{}'),available_at=now(),attempts=0,last_error=null,lease_token=null,lease_until=null where tile_x=p_x and tile_y=p_y;
 return true;
end $$;
revoke all on function public.enqueue_attraction_tiles(float8,float8,float8),public.claim_attraction_tile(),public.finish_attraction_page(int,int,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.enqueue_attraction_tiles(float8,float8,float8),public.claim_attraction_tile(),public.finish_attraction_page(int,int,uuid,jsonb,jsonb,text) to service_role;
commit;
