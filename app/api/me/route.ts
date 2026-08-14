import { ensureDatabase, getD1 } from "@/db";
import { getAppUser, unauthorized } from "@/lib/auth";

export async function GET() {
  const user = await getAppUser();
  if (!user) return unauthorized();
  await ensureDatabase();

  const profile = await getD1()
    .prepare(
      `SELECT id, email, nickname, created_at AS createdAt
       FROM profiles
       WHERE id = ?`,
    )
    .bind(user.id)
    .first();

  return Response.json({ user, profile: profile ?? null });
}
