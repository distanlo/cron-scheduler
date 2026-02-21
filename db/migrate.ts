import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sqlPath = path.join(process.cwd(), "db", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const pool = new Pool({ connectionString });
  try {
    await pool.query(sql);
    console.log("Migration completed.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
