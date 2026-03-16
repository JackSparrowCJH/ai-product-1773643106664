import { query, initDB } from "@/lib/db";

export async function POST(req: Request) {
  const { id, skin } = await req.json();
  if (!id || !skin) return Response.json({ error: "id and skin required" }, { status: 400 });
  await initDB();
  const res = await query(
    `UPDATE users SET skin = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, skin]
  );
  if (res.rows.length === 0) return Response.json({ error: "user not found" }, { status: 404 });
  return Response.json(res.rows[0]);
}
