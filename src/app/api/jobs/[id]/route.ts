import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { computeInitialNextRun } from "@/lib/scheduler";
import { updateJobSchema } from "@/lib/validators";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await request.json();
    const parsed = updateJobSchema.parse(json);

    const nextRun = computeInitialNextRun({
      isRecurring: parsed.isRecurring,
      recurrence: parsed.recurrence,
      recurringTime: parsed.recurringTime,
      recurringWeekday: parsed.recurringWeekday,
      runAt: parsed.runAt
    });

    await getPool().query(
      `UPDATE cron_jobs
       SET title = $1,
           prompt = $2,
           is_recurring = $3,
           recurrence = $4,
           recurring_time = $5,
           recurring_weekday = $6,
           run_at = $7,
           next_run = $8,
           use_web_search = $9,
           web_search_query = $10,
           web_result_count = $11,
           web_freshness_hours = $12,
           preferred_domains_csv = $13,
           discord_webhook_url = $14,
           status = COALESCE($15, status),
           updated_at = NOW()
       WHERE id = $16`,
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
        parsed.discordWebhookUrl,
        parsed.status,
        id
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await getPool().query(`DELETE FROM cron_jobs WHERE id = $1`, [id]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
