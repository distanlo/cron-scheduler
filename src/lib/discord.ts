export async function sendToDiscord(webhookUrl: string, title: string, output: string) {
  const maxLen = 1800;
  const content = `**${title}**\n\n${output.slice(0, maxLen)}`;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord webhook failed (${response.status}): ${text}`);
  }
}
