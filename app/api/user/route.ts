import { query, initDB } from "@/lib/db";

export async function POST(req: Request) {
  const { id, name } = await req.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await initDB();
  const res = await query(
    `INSERT INTO users (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = $2, updated_at = NOW()
     RETURNING *`,
    [id, name || "匿名"]
  );
  return Response.json(res.rows[0]);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await initDB();
  const res = await query("SELECT * FROM users WHERE id = $1", [id]);
  if (res.rows.length === 0) return Response.json(null);
  return Response.json(res.rows[0]);
}
