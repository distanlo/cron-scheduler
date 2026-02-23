import { z } from "zod";
import { RECURRENCE_VALUES } from "@/lib/types";

export const settingsSchema = z.object({
  modelBaseUrl: z.string().url(),
  modelName: z.string().min(1),
  modelApiKey: z.string().min(1).optional(),
  braveApiKey: z.string().min(1).optional()
});

const baseJobSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  isRecurring: z.boolean(),
  recurrence: z.enum(RECURRENCE_VALUES).nullable(),
  recurringTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  recurringWeekday: z.number().int().min(0).max(6).nullable(),
  runAt: z.string().datetime().nullable(),
  useWebSearch: z.boolean().default(false),
  webSearchQuery: z.string().min(1).nullable(),
  webResultCount: z.number().int().min(1).max(10).default(5),
  webFreshnessHours: z.number().int().min(1).max(720).default(72),
  preferredDomainsCsv: z.string().nullable(),
  contextSource: z.enum(["none", "brave_search", "json_url", "markdown_url"]).default("none"),
  contextUrl: z.string().url().nullable(),
  discordWebhookUrl: z.string().url()
});

function withScheduleValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    if (value.isRecurring) {
      if (!value.recurrence) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "recurrence is required" });
      }
      if (!value.recurringTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "recurringTime is required" });
      }
      if (value.recurrence === "weekly" && value.recurringWeekday == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "recurringWeekday is required for weekly" });
      }
    } else if (!value.runAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "runAt is required for one-time jobs" });
    }

    if ((value.contextSource === "json_url" || value.contextSource === "markdown_url") && !value.contextUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "contextUrl is required for json_url and markdown_url"
      });
    }
  });
}

export const createJobSchema = withScheduleValidation(baseJobSchema);

export const updateJobSchema = withScheduleValidation(
  baseJobSchema.extend({
    status: z.enum(["active", "paused", "error", "completed"]).optional()
  })
);
