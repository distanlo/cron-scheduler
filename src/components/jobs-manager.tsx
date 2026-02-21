"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CronJobRow, RecurrenceType } from "@/lib/types";
import { recurrenceLabel, weekdayLabel } from "@/lib/schedule-presenter";

type JobsManagerProps = {
  initialJobs: CronJobRow[];
};

export function JobsManager({ initialJobs }: JobsManagerProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const activeEditJob = useMemo(
    () => (editingId ? jobs.find((job) => job.id === editingId) ?? null : null),
    [editingId, jobs]
  );

  async function refreshJobs() {
    const response = await fetch("/api/jobs", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setJobs(data.jobs);
    }
  }

  async function deleteJob(id: string) {
    setMsg("Deleting job...");
    const response = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) {
      setMsg("Job deleted.");
      await refreshJobs();
      if (editingId === id) {
        setEditingId(null);
      }
      return;
    }
    setMsg(`Delete failed: ${data.error || "unknown"}`);
  }

  async function saveJob(formData: FormData, jobId: string) {
    setMsg("Saving job...");
    const isRecurring = String(formData.get("isRecurring") || "") === "recurring";
    const recurrence = String(formData.get("recurrence") || "") as RecurrenceType;

    const payload = {
      title: String(formData.get("title") || ""),
      prompt: String(formData.get("prompt") || ""),
      isRecurring,
      recurrence: isRecurring ? recurrence : null,
      recurringTime: isRecurring ? String(formData.get("recurringTime") || "") : null,
      recurringWeekday:
        isRecurring && recurrence === "weekly" ? Number(formData.get("recurringWeekday")) : null,
      runAt: !isRecurring
        ? (() => {
            const value = String(formData.get("runAt") || "");
            return value ? new Date(value).toISOString() : null;
          })()
        : null,
      discordWebhookUrl: String(formData.get("discordWebhookUrl") || ""),
      status: String(formData.get("status") || "active")
    };

    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (response.ok) {
      setMsg("Job updated.");
      setEditingId(null);
      await refreshJobs();
      return;
    }
    setMsg(`Update failed: ${data.error || "unknown"}`);
  }

  return (
    <>
      <section className="panel subtle">
        <div className="row between">
          <div>
            <h2 className="title">Scheduled Jobs</h2>
            <p className="muted">Edit, pause, or delete your existing cron jobs.</p>
          </div>
          <Link href="/" className="btn secondary compact">BACK TO CREATE</Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <span>ALL JOBS</span>
        </div>
        <div className="table-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Schedule</th>
                <th>Next Run (UTC)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>{job.is_recurring ? recurrenceLabel[job.recurrence as RecurrenceType] : "One-time"}</td>
                  <td>{new Date(job.next_run).toISOString()}</td>
                  <td>{job.status}</td>
                  <td className="action-cell">
                    <button type="button" className="btn secondary compact" onClick={() => setEditingId(job.id)}>
                      Edit
                    </button>
                    <button type="button" className="btn danger compact" onClick={() => deleteJob(job.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5}>No jobs created yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {activeEditJob ? (
        <section className="panel">
          <div className="panel-head">
            <span>EDIT JOB</span>
          </div>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              saveJob(new FormData(event.currentTarget), activeEditJob.id);
            }}
          >
            <div className="content-grid">
              <div>
                <label htmlFor="edit-title">Title</label>
                <input id="edit-title" name="title" defaultValue={activeEditJob.title} required />
              </div>

              <div>
                <label htmlFor="edit-webhook">Discord Webhook URL</label>
                <input
                  id="edit-webhook"
                  name="discordWebhookUrl"
                  type="url"
                  defaultValue={activeEditJob.discord_webhook_url}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-prompt">Prompt</label>
              <textarea id="edit-prompt" name="prompt" defaultValue={activeEditJob.prompt} rows={5} required />
            </div>

            <div className="content-grid">
              <div>
                <label htmlFor="edit-type">Schedule Type</label>
                <select id="edit-type" name="isRecurring" defaultValue={activeEditJob.is_recurring ? "recurring" : "one_time"}>
                  <option value="recurring">Recurring</option>
                  <option value="one_time">Non-recurring</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-status">Status</label>
                <select id="edit-status" name="status" defaultValue={activeEditJob.status}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="error">Error</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-recurrence">Recurrence</label>
                <select id="edit-recurrence" name="recurrence" defaultValue={activeEditJob.recurrence ?? "hourly_1"}>
                  {Object.entries(recurrenceLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-time">Recurring Time (UTC)</label>
                <input id="edit-time" name="recurringTime" type="time" defaultValue={activeEditJob.recurring_time ?? "00:00"} />
              </div>
              <div>
                <label htmlFor="edit-weekday">Weekly Day</label>
                <select id="edit-weekday" name="recurringWeekday" defaultValue={String(activeEditJob.recurring_weekday ?? 1)}>
                  {weekdayLabel.map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-run-at">One-time Run At (UTC)</label>
                <input
                  id="edit-run-at"
                  name="runAt"
                  type="datetime-local"
                  defaultValue={activeEditJob.run_at ? new Date(activeEditJob.run_at).toISOString().slice(0, 16) : ""}
                />
              </div>
            </div>

            <div className="row gap">
              <button type="submit" className="btn primary compact">Save Changes</button>
              <button type="button" className="btn secondary compact" onClick={() => setEditingId(null)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {msg ? <p className="msg">{msg}</p> : null}
    </>
  );
}
