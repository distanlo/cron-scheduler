CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY,
  model_api_key_enc TEXT,
  brave_api_key_enc TEXT,
  model_base_url TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
  model_name TEXT NOT NULL DEFAULT 'openrouter/free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_type') THEN
    CREATE TYPE recurrence_type AS ENUM (
      'hourly_1',
      'hourly_2',
      'hourly_4',
      'hourly_8',
      'hourly_12',
      'hourly_24',
      'every_other_day',
      'weekly'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL,
  recurrence recurrence_type,
  recurring_time TEXT,
  recurring_weekday SMALLINT,
  run_at TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  use_web_search BOOLEAN NOT NULL DEFAULT FALSE,
  web_search_query TEXT,
  web_result_count SMALLINT NOT NULL DEFAULT 5,
  web_freshness_hours INTEGER NOT NULL DEFAULT 72,
  preferred_domains_csv TEXT,
  discord_webhook_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_run_at TIMESTAMPTZ,
  last_output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((is_recurring = TRUE AND recurrence IS NOT NULL AND recurring_time IS NOT NULL AND next_run IS NOT NULL)
    OR (is_recurring = FALSE AND run_at IS NOT NULL AND next_run IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_cron_jobs_due
ON cron_jobs (status, next_run);

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS brave_api_key_enc TEXT;

ALTER TABLE cron_jobs
ADD COLUMN IF NOT EXISTS use_web_search BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cron_jobs
ADD COLUMN IF NOT EXISTS web_search_query TEXT;

ALTER TABLE cron_jobs
ADD COLUMN IF NOT EXISTS web_result_count SMALLINT NOT NULL DEFAULT 5;

ALTER TABLE cron_jobs
ADD COLUMN IF NOT EXISTS web_freshness_hours INTEGER NOT NULL DEFAULT 72;

ALTER TABLE cron_jobs
ADD COLUMN IF NOT EXISTS preferred_domains_csv TEXT;
