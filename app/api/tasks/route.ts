import { ensureDatabase, getD1 } from "@/db";
import { getAppUser, unauthorized } from "@/lib/auth";
import { apiError, parseTaskPayload } from "@/lib/tasks";

export async function GET() {
  const user = await getAppUser();
  if (!user) return unauthorized();
  await ensureDatabase();

  const db = getD1();
  const profile = await db
    .prepare("SELECT id FROM profiles WHERE id = ?")
    .bind(user.id)
    .first();
  if (!profile) {
    return Response.json({ error: "온보딩이 필요해요." }, { status: 403 });
  }

  const result = await db
    .prepare(
      `SELECT
        t.id,
        t.title,
        t.description,
        t.category,
        t.start_at AS startAt,
        t.deadline_at AS deadlineAt,
        t.min_participants AS minParticipants,
        t.max_participants AS maxParticipants,
        t.join_url AS joinUrl,
        t.status,
        t.creator_id AS creatorId,
        p.nickname AS creatorNickname,
        SUM(CASE WHEN tp.status = 'JOINED' THEN 1 ELSE 0 END) AS joinedCount,
        MAX(CASE WHEN tp.user_id = ? THEN tp.status ELSE NULL END) AS myStatus,
        CASE WHEN w.user_id IS NULL THEN 0 ELSE 1 END AS watching
       FROM tasks t
       JOIN profiles p ON p.id = t.creator_id
       LEFT JOIN task_participants tp ON tp.task_id = t.id
       LEFT JOIN task_watchers w ON w.task_id = t.id AND w.user_id = ?
       WHERE t.status IN ('OPEN', 'COMPLETED')
       GROUP BY t.id, w.user_id
       ORDER BY CASE WHEN t.status = 'OPEN' THEN 0 ELSE 1 END, t.start_at ASC
       LIMIT 100`,
    )
    .bind(user.id, user.id)
    .all();

  return Response.json({ tasks: result.results });
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  await ensureDatabase();

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const task = parseTaskPayload(payload);
    const db = getD1();
    const profile = await db
      .prepare("SELECT id FROM profiles WHERE id = ?")
      .bind(user.id)
      .first();
    if (!profile) {
      return Response.json({ error: "온보딩이 필요해요." }, { status: 403 });
    }

    const id = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          `INSERT INTO tasks
           (id, creator_id, title, description, category, start_at, deadline_at,
            min_participants, max_participants, join_url, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
        )
        .bind(
          id,
          user.id,
          task.title,
          task.description,
          task.category,
          task.startAt,
          task.deadlineAt,
          task.minParticipants,
          task.maxParticipants,
          task.joinUrl,
        ),
      db
        .prepare(
          `INSERT INTO task_participants (task_id, user_id, status)
           VALUES (?, ?, 'JOINED')`,
        )
        .bind(id, user.id),
    ]);

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
