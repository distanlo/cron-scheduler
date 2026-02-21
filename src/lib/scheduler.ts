import { RecurrenceType } from "@/lib/types";

function parseTimeToUtcParts(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error("Invalid time format; expected HH:mm");
  }

  return { hour: h, minute: m };
}

export function computeInitialNextRun(input: {
  isRecurring: boolean;
  recurrence: RecurrenceType | null;
  recurringTime: string | null;
  recurringWeekday: number | null;
  runAt: string | null;
}): Date {
  if (!input.isRecurring) {
    if (!input.runAt) {
      throw new Error("runAt is required for one-time jobs");
    }

    const runAt = new Date(input.runAt);
    if (Number.isNaN(runAt.getTime())) {
      throw new Error("Invalid runAt datetime");
    }

    return runAt;
  }

  return computeNextRecurringRun({
    recurrence: input.recurrence,
    recurringTime: input.recurringTime,
    recurringWeekday: input.recurringWeekday,
    from: new Date()
  });
}

export function computeNextRecurringRun(input: {
  recurrence: RecurrenceType | null;
  recurringTime: string | null;
  recurringWeekday: number | null;
  from: Date;
}): Date {
  const { recurrence, recurringTime, recurringWeekday, from } = input;
  if (!recurrence || !recurringTime) {
    throw new Error("recurrence and recurringTime are required");
  }

  const { hour, minute } = parseTimeToUtcParts(recurringTime);
  const now = new Date(from);

  if (recurrence.startsWith("hourly_")) {
    const everyHours = Number(recurrence.replace("hourly_", ""));
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      minute,
      0,
      0
    ));

    if (candidate <= now) {
      candidate.setUTCHours(candidate.getUTCHours() + 1);
    }

    while (candidate.getUTCHours() % everyHours !== hour % everyHours) {
      candidate.setUTCHours(candidate.getUTCHours() + 1);
    }

    candidate.setUTCMinutes(minute, 0, 0);
    return candidate;
  }

  if (recurrence === "every_other_day") {
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      minute,
      0,
      0
    ));

    while (candidate <= now) {
      candidate.setUTCDate(candidate.getUTCDate() + 2);
    }

    return candidate;
  }

  if (recurrence === "weekly") {
    if (recurringWeekday == null || recurringWeekday < 0 || recurringWeekday > 6) {
      throw new Error("recurringWeekday is required for weekly recurrence");
    }

    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      minute,
      0,
      0
    ));

    const currentWeekday = candidate.getUTCDay();
    const delta = (recurringWeekday - currentWeekday + 7) % 7;
    candidate.setUTCDate(candidate.getUTCDate() + delta);

    if (candidate <= now) {
      candidate.setUTCDate(candidate.getUTCDate() + 7);
    }

    return candidate;
  }

  throw new Error(`Unsupported recurrence: ${recurrence}`);
}
