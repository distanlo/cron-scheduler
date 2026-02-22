"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RecurrenceType } from "@/lib/types";
import { recurrenceLabel, weekdayLabel } from "@/lib/schedule-presenter";

type DashboardProps = {
  dbConfigured: boolean;
};

function toUtcIsoFromParts(datePart: string, timePart: string): string | null {
  if (!datePart || !timePart) {
    return null;
  }
  return new Date(`${datePart}T${timePart}:00Z`).toISOString();
}

function parseUtcTime(raw: string): string | null {
  const value = raw.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
}

export function Dashboard({ dbConfigured }: DashboardProps) {
  const [settingsMsg, setSettingsMsg] = useState("");
  const [jobMsg, setJobMsg] = useState("");

  const [isRecurring, setIsRecurring] = useState(true);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("hourly_1");
  const [useWebSearch, setUseWebSearch] = useState(false);

  const weekdayNeeded = recurrence === "weekly";
  const utcDateMin = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleSettings(formData: FormData) {
    setSettingsMsg("Saving settings...");
    const payload = {
      modelBaseUrl: String(formData.get("modelBaseUrl") || ""),
      modelName: String(formData.get("modelName") || ""),
      modelApiKey: String(formData.get("modelApiKey") || "") || undefined,
      braveApiKey: String(formData.get("braveApiKey") || "") || undefined
    };

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setSettingsMsg(response.ok ? "Settings saved." : `Error: ${data.error || "unknown"}`);
  }

  async function handleCreateJob(formData: FormData) {
    setJobMsg("Creating job...");
    const recurringTime = parseUtcTime(String(formData.get("recurringTime") || ""));
    const runAtTime = parseUtcTime(String(formData.get("runAtTime") || ""));

    if (isRecurring && !recurringTime) {
      setJobMsg("Error: time must be HH:mm in UTC (example: 23:47)");
      return;
    }
    if (!isRecurring && !runAtTime) {
      setJobMsg("Error: one-time time must be HH:mm in UTC (example: 23:47)");
      return;
    }

    const payload = {
      title: String(formData.get("title") || ""),
      prompt: String(formData.get("prompt") || ""),
      isRecurring,
      recurrence: isRecurring ? String(formData.get("recurrence") || "") : null,
      recurringTime: isRecurring ? recurringTime : null,
      recurringWeekday:
        isRecurring && recurrence === "weekly"
          ? Number(formData.get("recurringWeekday"))
          : null,
      runAt: !isRecurring
        ? (() => {
            const datePart = String(formData.get("runAtDate") || "");
            return toUtcIsoFromParts(datePart, runAtTime ?? "");
          })()
        : null,
      useWebSearch,
      webSearchQuery: useWebSearch ? String(formData.get("webSearchQuery") || "") || null : null,
      webResultCount: useWebSearch ? Number(formData.get("webResultCount") || 5) : 5,
      webFreshnessHours: useWebSearch ? Number(formData.get("webFreshnessHours") || 72) : 72,
      preferredDomainsCsv: useWebSearch
        ? String(formData.get("preferredDomainsCsv") || "") || null
        : null,
      discordWebhookUrl: String(formData.get("discordWebhookUrl") || "")
    };

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setJobMsg(response.ok ? "Job created." : `Error: ${data.error || "unknown"}`);
    if (response.ok) {
      (document.getElementById("create-job-form") as HTMLFormElement | null)?.reset();
    }
  }

  return (
    <>
      <section className="panel subtle">
        <div className="row between">
          <div>
            <h2 className="title">Scheduler Control Center</h2>
            <p className="muted">
              Create prompts, route output to Discord channels, and manage active jobs in one place.
            </p>
          </div>
          <Link href="/jobs" className="btn secondary compact">
            VIEW ALL SCHEDULED JOBS
          </Link>
        </div>
      </section>

      {!dbConfigured ? (
        <section className="panel warning">
          <h3 className="section-heading">Database Required</h3>
          <p className="muted">Set `DATABASE_URL` and run `npm run db:migrate` before creating jobs.</p>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <span>MODEL SETTINGS</span>
        </div>
        <div className="content-grid">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSettings(new FormData(event.currentTarget));
            }}
            className="stack"
          >
            <label htmlFor="modelBaseUrl">Model API Base URL</label>
            <input id="modelBaseUrl" name="modelBaseUrl" defaultValue="https://openrouter.ai/api/v1" required />

            <label htmlFor="modelName">Model</label>
            <input id="modelName" name="modelName" defaultValue="openrouter/free" required />

            <label htmlFor="modelApiKey">OpenRouter API Key</label>
            <input id="modelApiKey" name="modelApiKey" type="password" placeholder="sk-or-v1-..." />

            <label htmlFor="braveApiKey">Brave Search API Key</label>
            <input id="braveApiKey" name="braveApiKey" type="password" placeholder="BSA..." />

            <button type="submit" className="btn primary">Save Model Settings</button>
            <div className="msg">{settingsMsg}</div>
          </form>

          <div className="stack">
            <h3 className="section-heading">Discord Routing</h3>
            <p className="muted">
              Use a different webhook URL per job to map each cron output to a dedicated Discord channel.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <span>NEW CRON JOB</span>
        </div>
        <form
          id="create-job-form"
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateJob(new FormData(event.currentTarget));
          }}
        >
          <div className="content-grid">
            <div>
              <label htmlFor="title">Title</label>
              <input id="title" name="title" required />
            </div>

            <div>
              <label htmlFor="discordWebhookUrl">Discord Webhook URL</label>
              <input id="discordWebhookUrl" name="discordWebhookUrl" type="url" required />
            </div>
          </div>

          <div>
            <label htmlFor="prompt">Agent Prompt</label>
            <textarea id="prompt" name="prompt" required rows={5} />
          </div>

          <div className="content-grid">
            <div>
              <label htmlFor="isRecurring">Schedule Type</label>
              <select
                id="isRecurring"
                value={isRecurring ? "recurring" : "one_time"}
                onChange={(event) => setIsRecurring(event.target.value === "recurring")}
              >
                <option value="recurring">Recurring</option>
                <option value="one_time">Non-recurring</option>
              </select>
            </div>

            {isRecurring ? (
              <>
                <div>
                  <label htmlFor="recurrence">Recurrence</label>
                  <select
                    id="recurrence"
                    name="recurrence"
                    value={recurrence}
                    onChange={(event) => setRecurrence(event.target.value as RecurrenceType)}
                  >
                    {Object.entries(recurrenceLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="recurringTime">Time (UTC, HH:mm)</label>
                  <input
                    id="recurringTime"
                    name="recurringTime"
                    type="text"
                    placeholder="23:00"
                    inputMode="numeric"
                    required
                  />
                </div>

                {weekdayNeeded ? (
                  <div>
                    <label htmlFor="recurringWeekday">Weekday</label>
                    <select id="recurringWeekday" name="recurringWeekday" defaultValue="1">
                      {weekdayLabel.map((day, idx) => (
                        <option key={day} value={idx}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </>
            ) : (
              <div>
                <label htmlFor="runAtDate">Run At Date (UTC)</label>
                <input id="runAtDate" name="runAtDate" type="date" min={utcDateMin} required />
                <label htmlFor="runAtTime">Run At Time (UTC, HH:mm)</label>
                <input
                  id="runAtTime"
                  name="runAtTime"
                  type="text"
                  placeholder="23:00"
                  inputMode="numeric"
                  required
                />
              </div>
            )}
          </div>

          <div className="content-grid">
            <div>
              <label htmlFor="useWebSearch">Live Web Grounding</label>
              <select
                id="useWebSearch"
                value={useWebSearch ? "enabled" : "disabled"}
                onChange={(event) => setUseWebSearch(event.target.value === "enabled")}
              >
                <option value="disabled">Disabled</option>
                <option value="enabled">Use Brave Search</option>
              </select>
            </div>

            {useWebSearch ? (
              <>
                <div>
                  <label htmlFor="webSearchQuery">Web Query (optional)</label>
                  <input id="webSearchQuery" name="webSearchQuery" placeholder="Top Reuters world headlines today" />
                </div>
                <div>
                  <label htmlFor="webResultCount">Result Count (1-10)</label>
                  <input id="webResultCount" name="webResultCount" type="number" min={1} max={10} defaultValue={5} />
                </div>
                <div>
                  <label htmlFor="webFreshnessHours">Freshness Window (hours)</label>
                  <input
                    id="webFreshnessHours"
                    name="webFreshnessHours"
                    type="number"
                    min={1}
                    max={720}
                    defaultValue={72}
                  />
                </div>
                <div>
                  <label htmlFor="preferredDomainsCsv">Preferred Domains (comma-separated)</label>
                  <input
                    id="preferredDomainsCsv"
                    name="preferredDomainsCsv"
                    placeholder="reuters.com, apnews.com, bbc.com"
                  />
                </div>
              </>
            ) : null}
          </div>

          <button type="submit" className="btn primary">Create Job</button>
          <div className="msg">{jobMsg}</div>
        </form>
      </section>
    </>
  );
}
