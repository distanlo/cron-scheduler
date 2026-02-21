import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { sendToDiscord } from "@/lib/discord";
import { runModelPrompt } from "@/lib/model";
import { computeNextRecurringRun } from "@/lib/scheduler";
import { CronJobRow } from "@/lib/types";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await getPool().connect();
  const processed: Array<{ id: string; status: string; error?: string }> = [];

  try {
    const dueResult = await client.query<CronJobRow>(
      `SELECT id, title, prompt, is_recurring, recurrence, recurring_time, recurring_weekday,
              run_at, next_run, discord_webhook_url, status, last_run_at, last_output,
              created_at, updated_at
       FROM cron_jobs
       WHERE status = 'active'
         AND next_run <= NOW()
       ORDER BY next_run ASC
       LIMIT 20`
    );

    for (const job of dueResult.rows) {
      try {
        const output = await runModelPrompt(job.prompt);
        await sendToDiscord(job.discord_webhook_url, job.title, output);

        const nextRun = job.is_recurring
          ? computeNextRecurringRun({
              recurrence: job.recurrence,
              recurringTime: job.recurring_time,
              recurringWeekday: job.recurring_weekday,
              from: new Date()
            }).toISOString()
          : null;

        await client.query(
          `UPDATE cron_jobs
           SET last_run_at = NOW(),
               last_output = $1,
               next_run = $2,
               status = CASE WHEN is_recurring THEN 'active' ELSE 'completed' END,
               updated_at = NOW()
           WHERE id = $3`,
          [output, nextRun, job.id]
        );

        processed.push({ id: job.id, status: "ok" });
      } catch (error) {
        await client.query(
          `UPDATE cron_jobs
           SET status = 'error',
               last_output = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [String(error), job.id]
        );
        processed.push({ id: job.id, status: "error", error: String(error) });
      }
    }

    return NextResponse.json({ ok: true, processed });
  } finally {
    client.release();
  }
}
