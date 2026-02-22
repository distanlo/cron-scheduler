export const RECURRENCE_VALUES = [
  "hourly_1",
  "hourly_2",
  "hourly_4",
  "hourly_8",
  "hourly_12",
  "hourly_24",
  "every_other_day",
  "weekly"
] as const;

export type RecurrenceType = (typeof RECURRENCE_VALUES)[number];

export type CronJobRow = {
  id: string;
  title: string;
  prompt: string;
  is_recurring: boolean;
  recurrence: RecurrenceType | null;
  recurring_time: string | null;
  recurring_weekday: number | null;
  run_at: string | null;
  next_run: string;
  use_web_search: boolean;
  web_search_query: string | null;
  web_result_count: number;
  web_freshness_hours: number;
  preferred_domains_csv: string | null;
  discord_webhook_url: string;
  status: string;
  last_run_at: string | null;
  last_output: string | null;
  created_at: string;
  updated_at: string;
};
