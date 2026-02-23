import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { computeInitialNextRun } from "@/lib/scheduler";
import { createJobSchema } from "@/lib/validators";
import { CronJobRow } from "@/lib/types";

export async function GET() {
  try {
    const result = await getPool().query<CronJobRow>(
      `SELECT id, title, prompt, is_recurring, recurrence, recurring_time, recurring_weekday,
              run_at, next_run, use_web_search, web_search_query, web_result_count,
              web_freshness_hours, preferred_domains_csv, context_source, context_url,
              discord_webhook_url, status, last_run_at, last_output,
              created_at, updated_at
       FROM cron_jobs
       ORDER BY created_at DESC`
    );

    return NextResponse.json({ jobs: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createJobSchema.parse(json);

    const nextRun = computeInitialNextRun({
      isRecurring: parsed.isRecurring,
      recurrence: parsed.recurrence,
      recurringTime: parsed.recurringTime,
      recurringWeekday: parsed.recurringWeekday,
      runAt: parsed.runAt
    });

    await getPool().query(
      `INSERT INTO cron_jobs (
        title,
        prompt,
        is_recurring,
        recurrence,
        recurring_time,
        recurring_weekday,
        run_at,
        next_run,
        use_web_search,
        web_search_query,
        web_result_count,
        web_freshness_hours,
        preferred_domains_csv,
        context_source,
        context_url,
        discord_webhook_url,
        status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active')`,
      [
        parsed.title,
        parsed.prompt,
        parsed.isRecurring,
        parsed.recurrence,
        parsed.recurringTime,
        parsed.recurringWeekday,
        parsed.runAt,
        nextRun.toISOString(),
        parsed.useWebSearch,
        parsed.webSearchQuery,
        parsed.webResultCount,
        parsed.webFreshnessHours,
        parsed.preferredDomainsCsv,
        parsed.contextSource,
        parsed.contextUrl,
        parsed.discordWebhookUrl
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
