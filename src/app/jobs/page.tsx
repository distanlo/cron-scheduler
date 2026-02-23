import { getPool } from "@/lib/db";
import { CronJobRow } from "@/lib/types";
import { JobsManager } from "@/components/jobs-manager";

export const dynamic = "force-dynamic";

async function getJobs(): Promise<CronJobRow[]> {
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

    return result.rows;
  } catch {
    return [];
  }
}

export default async function JobsPage() {
  const jobs = await getJobs();

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container row between">
          <div className="brand-wrap">
            <span className="brand">CRON AGENT</span>
            <span className="tag">Discord Delivery Scheduler</span>
          </div>
          <span className="status">ONLINE</span>
        </div>
      </header>
      <div className="container page-body">
        <JobsManager initialJobs={jobs} />
      </div>
    </main>
  );
}
