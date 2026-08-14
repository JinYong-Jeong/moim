import { ensureDatabase, getD1 } from "@/db";
import { getAppUser, unauthorized } from "@/lib/auth";
import { isParticipationStatus } from "@/lib/tasks";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  await ensureDatabase();
  const { taskId } = await context.params;
  const payload = (await request.json()) as {
    status?: unknown;
    reason?: unknown;
  };
  if (!isParticipationStatus(payload.status)) {
    return Response.json({ error: "참여 상태를 확인해 주세요." }, { status: 400 });
  }

  const reason = String(payload.reason ?? "").trim().slice(0, 100) || null;
  const db = getD1();
  const task = await db
    .prepare(
      `SELECT status, deadline_at AS deadlineAt,
              max_participants AS maxParticipants
       FROM tasks WHERE id = ?`,
    )
    .bind(taskId)
    .first<{
      status: string;
      deadlineAt: string | null;
      maxParticipants: number;
    }>();
  if (!task) {
    return Response.json({ error: "모임을 찾을 수 없어요." }, { status: 404 });
  }
  if (task.status !== "OPEN") {
    return Response.json({ error: "종료된 모임이에요." }, { status: 409 });
  }

  const current = await db
    .prepare(
      `SELECT status FROM task_participants
       WHERE task_id = ? AND user_id = ?`,
    )
    .bind(taskId, user.id)
    .first<{ status: string }>();

  if (
    payload.status === "JOINED" &&
    current?.status !== "JOINED" &&
    task.deadlineAt &&
    new Date(task.deadlineAt).getTime() < Date.now()
  ) {
    return Response.json({ error: "모집이 마감됐어요." }, { status: 409 });
  }

  if (payload.status === "JOINED") {
    const result = await db
      .prepare(
        `INSERT INTO task_participants
          (task_id, user_id, status, leave_reason)
         SELECT ?, ?, 'JOINED', NULL
         WHERE (
           SELECT COUNT(*) FROM task_participants
           WHERE task_id = ? AND status = 'JOINED'
         ) < (
           SELECT max_participants FROM tasks WHERE id = ?
         )
         ON CONFLICT(task_id, user_id) DO UPDATE SET
           status = 'JOINED', leave_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE task_participants.status = 'JOINED' OR (
           SELECT COUNT(*) FROM task_participants
           WHERE task_id = ? AND status = 'JOINED'
         ) < (
           SELECT max_participants FROM tasks WHERE id = ?
         )`,
      )
      .bind(taskId, user.id, taskId, taskId, taskId, taskId)
      .run();
    if ((result.meta.changes ?? 0) === 0) {
      return Response.json(
        { error: "현재 모집이 완료되었어요." },
        { status: 409 },
      );
    }
  } else {
    await db
      .prepare(
        `INSERT INTO task_participants
          (task_id, user_id, status, leave_reason)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(task_id, user_id) DO UPDATE SET
           status = excluded.status,
           leave_reason = excluded.leave_reason,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(taskId, user.id, payload.status, reason)
      .run();
  }

  const count = await db
    .prepare(
      `SELECT COUNT(*) AS joinedCount FROM task_participants
       WHERE task_id = ? AND status = 'JOINED'`,
    )
    .bind(taskId)
    .first<{ joinedCount: number }>();

  return Response.json({
    status: payload.status,
    joinedCount: count?.joinedCount ?? 0,
  });
}
