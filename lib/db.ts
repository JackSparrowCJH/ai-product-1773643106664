import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DB_URL });

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '匿名',
      merit BIGINT NOT NULL DEFAULT 0,
      skin TEXT NOT NULL DEFAULT 'classic',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
