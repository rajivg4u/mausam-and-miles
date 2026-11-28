select jobid,jobname,schedule,active from cron.job where jobname='mausam-attractions-v4';
select status,count(*) from public.attraction_import_jobs group by status;
select count(*) total_records,count(*) filter(where is_verified) verified,count(*) filter(where source_revision is not null) revision_tracked from public.attractions;
select id,status_code,content,created from net._http_response order by created desc limit 20;
