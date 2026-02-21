import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { settingsSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = settingsSchema.parse(json);

    if (parsed.modelApiKey) {
      const encrypted = encrypt(parsed.modelApiKey);
      await getPool().query(
        `UPDATE app_settings
         SET model_base_url = $1,
             model_name = $2,
             model_api_key_enc = $3,
             updated_at = NOW()
         WHERE id = 1`,
        [parsed.modelBaseUrl, parsed.modelName, encrypted]
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
