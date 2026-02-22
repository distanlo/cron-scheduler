import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { settingsSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = settingsSchema.parse(json);
    const encryptedModelApiKey = parsed.modelApiKey ? encrypt(parsed.modelApiKey) : null;
    const encryptedBraveApiKey = parsed.braveApiKey ? encrypt(parsed.braveApiKey) : null;

    if (encryptedModelApiKey || encryptedBraveApiKey) {
      await getPool().query(
        `UPDATE app_settings
         SET model_base_url = $1,
             model_name = $2,
             model_api_key_enc = COALESCE($3, model_api_key_enc),
             brave_api_key_enc = COALESCE($4, brave_api_key_enc),
             updated_at = NOW()
         WHERE id = 1`,
        [parsed.modelBaseUrl, parsed.modelName, encryptedModelApiKey, encryptedBraveApiKey]
      );
    } else {
      await getPool().query(
        `UPDATE app_settings
         SET model_base_url = $1,
             model_name = $2,
             updated_at = NOW()
         WHERE id = 1`,
        [parsed.modelBaseUrl, parsed.modelName]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
