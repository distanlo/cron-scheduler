import { Pool } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool };
let productionPool: Pool | undefined;

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL
  });
}

export function getPool(): Pool {
  if (process.env.NODE_ENV === "production") {
    if (!productionPool) {
      productionPool = createPool();
    }
    return productionPool;
  }

  if (!globalForDb.pool) {
    globalForDb.pool = createPool();
  }

  return globalForDb.pool;
}
