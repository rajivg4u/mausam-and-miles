select cron.alter_job(jobid, active := false) from cron.job where jobname='mausam-attractions-v4';
