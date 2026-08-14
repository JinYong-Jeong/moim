import { ensureDatabase, getD1 } from "@/db";
import { getAppUser, unauthorized } from "@/lib/auth";
import { apiError, parseTaskPayload } from "@/lib/tasks";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  await ensureDatabase();
  const { taskId } = await context.params;
  const db = getD1();

  const task = await db
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
       WHERE t.id = ?
       GROUP BY t.id, w.user_id`,
    )
    .bind(user.id, user.id, taskId)
    .first();

  if (!task) {
    return Response.json({ error: "모임을 찾을 수 없어요." }, { status: 404 });
  }

  const participants = await db
    .prepare(
      `SELECT p.id, p.nickname, tp.status
       FROM task_participants tp
       JOIN profiles p ON p.id = tp.user_id
       WHERE tp.task_id = ?
       ORDER BY CASE tp.status
         WHEN 'JOINED' THEN 0 WHEN 'MAYBE' THEN 1 ELSE 2 END,
         tp.created_at ASC`,
    )
    .bind(taskId)
    .all();

  return Response.json({ task, participants: participants.results });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  await ensureDatabase();
  const { taskId } = await context.params;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const db = getD1();
    const current = await db
      .prepare("SELECT creator_id AS creatorId FROM tasks WHERE id = ?")
      .bind(taskId)
      .first<{ creatorId: string }>();
    if (!current) throw new Error("모임을 찾을 수 없어요.");
    if (current.creatorId !== user.id) {
      return Response.json(
        { error: "모임을 만든 사람만 변경할 수 있어요." },
        { status: 403 },
      );
    }

    const action = String(payload.action ?? "");
    if (action === "CANCELLED" || action === "COMPLETED") {
      await db
        .prepare(
          `UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .bind(action, taskId)
        .run();

      if (action === "CANCELLED") {
        await db
          .prepare(
            `INSERT OR IGNORE INTO notification_events
             (id, task_id, event_type)
             VALUES (?, ?, 'TASK_CANCELLED')`,
          )
          .bind(crypto.randomUUID(), taskId)
          .run();
      }
      return Response.json({ ok: true });
    }

    const task = parseTaskPayload(payload);
    await db
      .prepare(
        `UPDATE tasks SET
          title = ?, description = ?, category = ?, start_at = ?, deadline_at = ?,
          min_participants = ?, max_participants = ?, join_url = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(
        task.title,
        task.description,
        task.category,
        task.startAt,
        task.deadlineAt,
        task.minParticipants,
        task.maxParticipants,
        task.joinUrl,
        taskId,
      )
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
