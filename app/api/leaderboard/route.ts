import { query, initDB } from "@/lib/db";

export async function GET() {
  await initDB();
  const res = await query("SELECT id, name, merit FROM users ORDER BY merit DESC LIMIT 50");
  return Response.json(res.rows);
}
