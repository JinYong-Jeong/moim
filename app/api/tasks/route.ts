import type { ParticipationStatus } from "@/components/task/types";
import { getAppUser, unauthorized } from "@/lib/auth";
import { apiError, parseTaskPayload } from "@/lib/tasks";
import { databaseError, toTaskSummary, type TaskOverviewRow } from "@/lib/task-data";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getAppUser();
  if (!user) return unauthorized();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return Response.json({ error: "가입 후 이용해 주세요." }, { status: 403 });
  }

  const [{ data: rows, error }, { data: myRows }, { data: watchRows }] =
    await Promise.all([
      supabase
        .from("task_overview")
        .select("*")
        .in("status", ["OPEN", "COMPLETED"])
        .order("start_at", { ascending: true })
        .limit(100),
      supabase
        .from("task_participants")
        .select("task_id, status")
        .eq("user_id", user.id),
      supabase
        .from("task_watchers")
        .select("task_id")
        .eq("user_id", user.id),
    ]);

  if (error) return databaseError(error, "모임을 불러오지 못했어요.");

  const statuses = new Map(
    (myRows ?? []).map((row) => [row.task_id, row.status as ParticipationStatus]),
  );
  const watched = new Set((watchRows ?? []).map((row) => row.task_id));
  const tasks = ((rows ?? []) as TaskOverviewRow[])
    .map((row) => toTaskSummary(row, statuses.get(row.id) ?? null, watched.has(row.id)))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });

  return Response.json({ tasks });
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return unauthorized();

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const task = parseTaskPayload(payload);
    const supabase = await createClient();
    const { data: id, error } = await supabase.rpc("create_task", {
      p_title: task.title,
      p_description: task.description ?? "",
      p_category: task.category,
      p_start_at: task.startAt,
      p_deadline_at: task.deadlineAt,
      p_min_participants: task.minParticipants,
      p_max_participants: task.maxParticipants,
      p_join_url: task.joinUrl ?? "",
    });

    if (error) return databaseError(error, "모임을 만들지 못했어요.");
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
