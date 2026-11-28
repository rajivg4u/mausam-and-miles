begin;
-- Run after pausing cron and waiting for all old invocations to exit.
lock table public.attraction_import_jobs in share row exclusive mode;
-- Abort rather than invalidate a live lease.
do $migration$
begin
 if exists(select 1 from public.attraction_import_jobs where status='running' and lease_until>now()) then
 raise exception 'Active worker lease: wait and retry migration';
 end if;
end;
$migration$;
-- Restart incomplete scans: V4 property cursors cannot be reused by list=geosearch.
update public.attraction_import_jobs set cursor_data='{}',status='pending',available_at=now(),lease_until=null,lease_token=null,attempts=0,last_error=null
where status in ('pending','running','failed');
create index if not exists attraction_jobs_ready_idx on public.attraction_import_jobs(available_at) where status in ('pending','failed');
create index if not exists attraction_jobs_lease_idx on public.attraction_import_jobs(lease_until) where status='running';
commit;
