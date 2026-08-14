import { getAppUser, unauthorized } from "@/lib/auth";
import { databaseError } from "@/lib/task-data";
import { isParticipationStatus } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  const { taskId } = await context.params;
  const payload = (await request.json()) as {
    status?: unknown;
    reason?: unknown;
  };
  if (!isParticipationStatus(payload.status)) {
    return Response.json({ error: "참여 상태를 확인해 주세요." }, { status: 400 });
  }

  const reason = String(payload.reason ?? "").trim().slice(0, 100) || null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_task_participation", {
    p_task_id: taskId,
    p_status: payload.status,
    p_reason: reason,
  });

  if (error) return databaseError(error, "참여 상태를 변경하지 못했어요.");
  const result = Array.isArray(data) ? data[0] : data;
  return Response.json({
    status: payload.status,
    joinedCount: result?.joined_count ?? 0,
  });
}
