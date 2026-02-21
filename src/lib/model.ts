import { decrypt } from "@/lib/crypto";
import { getPool } from "@/lib/db";

export async function runModelPrompt(prompt: string): Promise<string> {
  const result = await getPool().query<{
    model_api_key_enc: string | null;
    model_base_url: string;
    model_name: string;
  }>(
    `SELECT model_api_key_enc, model_base_url, model_name
     FROM app_settings
     WHERE id = 1`
  );

  const settings = result.rows[0];
  if (!settings?.model_api_key_enc) {
    throw new Error("Model API key has not been configured.");
  }

  const key = decrypt(settings.model_api_key_enc);
  const baseUrl = settings.model_base_url.replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.APP_BASE_URL ?? "https://cron-mocha.vercel.app",
      "X-Title": "Cron Agent Scheduler"
    },
    body: JSON.stringify({
      model: settings.model_name,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Model request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };

  const rawContent = data.choices?.[0]?.message?.content;
  const content =
    typeof rawContent === "string"
      ? rawContent.trim()
      : Array.isArray(rawContent)
        ? rawContent
            .map((chunk) => (chunk.type === "text" && chunk.text ? chunk.text : ""))
            .join("")
            .trim()
        : "";
  if (!content) {
    throw new Error("Model returned empty content.");
  }

  return content;
}
