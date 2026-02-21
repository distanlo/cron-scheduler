import { RecurrenceType } from "@/lib/types";

export const recurrenceLabel: Record<RecurrenceType, string> = {
  hourly_1: "Every hour",
  hourly_2: "Every 2 hours",
  hourly_4: "Every 4 hours",
  hourly_8: "Every 8 hours",
  hourly_12: "Every 12 hours",
  hourly_24: "Every 24 hours",
  every_other_day: "Every other day",
  weekly: "Weekly"
};

export const weekdayLabel = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
