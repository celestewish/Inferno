select cron.schedule(
  'daily-digest-send',
  '0 13 * * *',
  $$
  select net.http_post(
    url := 'https://qprtaihyjfgswggrekpm.supabase.co/functions/v1/daily-digest?mode=all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'daily_digest_service_role_key' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);
