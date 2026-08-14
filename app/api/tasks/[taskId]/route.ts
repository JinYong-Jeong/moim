import type { ParticipationStatus } from "@/components/task/types";
import { getAppUser, unauthorized } from "@/lib/auth";
import { apiError, parseTaskPayload } from "@/lib/tasks";
import { databaseError, toTaskSummary, type TaskOverviewRow } from "@/lib/task-data";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  const { taskId } = await context.params;
  const supabase = await createClient();

  const [overviewResult, statusResult, watchResult, participantsResult] =
    await Promise.all([
      supabase.from("task_overview").select("*").eq("id", taskId).maybeSingle(),
      supabase
        .from("task_participants")
        .select("status")
        .eq("task_id", taskId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("task_watchers")
        .select("task_id")
        .eq("task_id", taskId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("task_participants")
        .select("user_id, status, profiles!task_participants_user_id_fkey(nickname)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
    ]);

  if (overviewResult.error) {
    return databaseError(overviewResult.error, "모임을 불러오지 못했어요.");
  }
  if (!overviewResult.data) {
    return Response.json({ error: "모임을 찾을 수 없어요." }, { status: 404 });
  }

  const task = toTaskSummary(
    overviewResult.data as TaskOverviewRow,
    (statusResult.data?.status as ParticipationStatus) ?? null,
    Boolean(watchResult.data),
  );
  const statusOrder = { JOINED: 0, MAYBE: 1, DECLINED: 2 };
  const participants = (participantsResult.data ?? [])
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.user_id,
        nickname: profile?.nickname ?? "친구",
        status: row.status as Exclude<ParticipationStatus, null>,
      };
    })
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return Response.json({ task, participants });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  const { taskId } = await context.params;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const supabase = await createClient();
    const { data: current } = await supabase
      .from("tasks")
      .select("creator_id")
      .eq("id", taskId)
      .maybeSingle();
    if (!current) throw new Error("모임을 찾을 수 없어요.");
    if (current.creator_id !== user.id) {
      return Response.json(
        { error: "모임을 만든 사람만 변경할 수 있어요." },
        { status: 403 },
      );
    }

    const action = String(payload.action ?? "");
    if (action === "CANCELLED" || action === "COMPLETED") {
      const { error } = await supabase
        .from("tasks")
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("creator_id", user.id);
      if (error) return databaseError(error, "모임 상태를 변경하지 못했어요.");
      return Response.json({ ok: true });
    }

    const task = parseTaskPayload(payload);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: task.title,
        description: task.description,
        category: task.category,
        start_at: task.startAt,
        deadline_at: task.deadlineAt,
        min_participants: task.minParticipants,
        max_participants: task.maxParticipants,
        join_url: task.joinUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("creator_id", user.id);
    if (error) return databaseError(error, "모임을 수정하지 못했어요.");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
