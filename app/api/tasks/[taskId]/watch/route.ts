import { ensureDatabase, getD1 } from "@/db";
import { getAppUser, unauthorized } from "@/lib/auth";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  await ensureDatabase();
  const { taskId } = await context.params;
  const payload = (await request.json()) as { watching?: boolean };
  const db = getD1();

  if (payload.watching) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO task_watchers (task_id, user_id)
         VALUES (?, ?)`,
      )
      .bind(taskId, user.id)
      .run();
  } else {
    await db
      .prepare("DELETE FROM task_watchers WHERE task_id = ? AND user_id = ?")
      .bind(taskId, user.id)
      .run();
  }

  return Response.json({ watching: Boolean(payload.watching) });
}
