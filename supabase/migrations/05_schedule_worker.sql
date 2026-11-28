-- Enable pg_cron and pg_net in Dashboard > Database > Extensions first.
-- Create Vault secrets named attractions_worker_url and attractions_worker_token
-- in the dashboard. URL is the full deployed Edge Function URL.
select cron.schedule('mausam-attractions-v4','* * * * *', $job$
 select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='attractions_worker_url' limit 1),
 headers := jsonb_build_object('Content-Type','application/json','x-worker-token',(select decrypted_secret from vault.decrypted_secrets where name='attractions_worker_token' limit 1)),body := '{}'::jsonb,timeout_milliseconds := 60000);
$job$);
