import { decrypt } from "@/lib/crypto";
import { getPool } from "@/lib/db";
import { CronJobRow } from "@/lib/types";

type BraveSearchResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      age?: string;
      page_age?: string;
    }>;
  };
};

function freshnessParam(hours: number): string {
  if (hours <= 24) {
    return "pd";
  }
  if (hours <= 24 * 7) {
    return "pw";
  }
  if (hours <= 24 * 31) {
    return "pm";
  }
  return "py";
}

function normalizeDomains(csv: string | null): string[] {
  if (!csv) {
    return [];
  }

  return csv
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function buildLiveWebContext(job: CronJobRow): Promise<string | null> {
  if (!(job.use_web_search || job.context_source === "brave_search")) {
    return null;
  }

  const settingsResult = await getPool().query<{ brave_api_key_enc: string | null }>(
    `SELECT brave_api_key_enc FROM app_settings WHERE id = 1`
  );

  const encryptedKey = settingsResult.rows[0]?.brave_api_key_enc;
  if (!encryptedKey) {
    throw new Error("Brave API key is not configured. Save it in Model Settings.");
  }

  const key = decrypt(encryptedKey);
  const query = (job.web_search_query || job.prompt).trim();
  if (!query) {
    return null;
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(job.web_result_count || 5));
  url.searchParams.set("freshness", freshnessParam(job.web_freshness_hours || 72));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": key
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brave search failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as BraveSearchResponse;
  const results = data.web?.results ?? [];

  const preferredDomains = normalizeDomains(job.preferred_domains_csv);
  const filtered = results.filter((result) => {
    if (!result.url || preferredDomains.length === 0) {
      return true;
    }

    try {
      const hostname = new URL(result.url).hostname.toLowerCase();
      return preferredDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  });

  const finalResults = filtered.slice(0, job.web_result_count || 5);
  if (finalResults.length === 0) {
    return "No live web results matched the filters.";
  }

  const lines = finalResults.map((result, index) => {
    const title = result.title || "Untitled";
    const urlValue = result.url || "";
    const description = result.description || "";
    const age = result.page_age || result.age || "unknown";

    return `${index + 1}. ${title}\nURL: ${urlValue}\nPublished/age: ${age}\nSnippet: ${description}`;
  });

  return lines.join("\n\n");
}

export function composeGroundedPrompt(basePrompt: string, context: string): string {
  const now = new Date().toISOString();
  return [
    `Current UTC timestamp: ${now}`,
    "You must answer using only the provided live web context below.",
    "If a requested fact is missing from context, say it is unavailable.",
    "Include source URLs in your answer.",
    "",
    "LIVE WEB CONTEXT:",
    context,
    "",
    "USER REQUEST:",
    basePrompt
  ].join("\n");
}

export async function buildUrlContext(job: CronJobRow): Promise<string | null> {
  if (!job.context_url) {
    return null;
  }

  const response = await fetch(job.context_url, {
    method: "GET",
    headers: {
      Accept: job.context_source === "json_url" ? "application/json" : "text/markdown,text/plain"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Context URL fetch failed (${response.status}): ${body}`);
  }

  const text =
    job.context_source === "json_url"
      ? JSON.stringify(await response.json(), null, 2)
      : await response.text();

  return text.slice(0, 20000);
}
