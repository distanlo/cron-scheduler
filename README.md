# Cron Agent Scheduler (Vercel)

A deployable Next.js app that lets you define AI prompt jobs and send each job output to a dedicated Discord channel via webhook.

## What it supports

- Create cron jobs with:
  - `title`
  - `agent prompt`
  - recurring or one-time mode
  - recurring choices:
    - every 1 / 2 / 4 / 8 / 12 / 24 hours
    - every other day
    - weekly
  - recurring run time (`HH:mm`, UTC)
  - weekly day selection
  - one-time date+time
- Configure model API settings in UI:
  - OpenRouter `base URL` (default: `https://openrouter.ai/api/v1`)
  - OpenRouter free router model (default: `openrouter/free`)
  - encrypted `API key`
- Send output to Discord per job using a channel-specific webhook URL.
- Job processor endpoint designed to be triggered every 5 minutes.
- Dedicated `/jobs` page to edit and delete scheduled jobs.

## Stack

- Next.js App Router
- Postgres (`pg`)
- GitHub Actions scheduler + Vercel API endpoint
- Zod validation

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Fill env values:

- `DATABASE_URL`: Postgres connection string
- `ENCRYPTION_KEY`: base64-encoded 32-byte key
- `CRON_SECRET`: random string

Generate encryption key:

```bash
openssl rand -base64 32
```

4. Run DB migration:

```bash
npm run db:migrate
```

5. Run app locally:

```bash
npm run dev
```

## Deploy on Vercel

1. Push to GitHub and import to Vercel.
2. Set environment variables in Vercel project settings.
3. Run migration against your production DB (`npm run db:migrate`) using your prod `DATABASE_URL`.
4. Add two GitHub Actions repository secrets:
   - `APP_BASE_URL` (example: `https://your-app.vercel.app`)
   - `CRON_SECRET` (same value as your Vercel env var)
5. The included workflow `.github/workflows/process-jobs.yml` triggers processing every 5 minutes.

## Discord configuration

1. In each target Discord channel, create a webhook (`Edit Channel -> Integrations -> Webhooks`).
2. Paste that webhook URL into the job form.
3. Each job can use a different webhook URL, giving one channel per job.

## Notes

- Times are stored and processed in UTC.
- One-time jobs become `completed` after execution.
- If a job fails, status becomes `error` and the error is stored in `last_output`.
- Vercel Hobby blocks high-frequency Vercel Cron schedules; GitHub Actions handles the 5-minute trigger.
