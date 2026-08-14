import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Participant,
  ParticipationStatus,
  TaskSummary,
} from "@/components/task/types";
import { toTaskSummary, type TaskOverviewRow } from "@/lib/task-data";

export async function loadTaskList(
  supabase: SupabaseClient,
  userId: string,
): Promise<TaskSummary[]> {
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
        .eq("user_id", userId),
      supabase
        .from("task_watchers")
        .select("task_id")
        .eq("user_id", userId),
    ]);

  if (error) throw error;

  const statuses = new Map(
    (myRows ?? []).map((row) => [
      row.task_id,
      row.status as ParticipationStatus,
    ]),
  );
  const watched = new Set((watchRows ?? []).map((row) => row.task_id));

  return ((rows ?? []) as TaskOverviewRow[])
    .map((row) =>
      toTaskSummary(row, statuses.get(row.id) ?? null, watched.has(row.id)),
    )
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
}

export async function loadTaskDetail(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<{ task: TaskSummary; participants: Participant[] } | null> {
  const [overviewResult, statusResult, watchResult, participantsResult] =
    await Promise.all([
      supabase.from("task_overview").select("*").eq("id", taskId).maybeSingle(),
      supabase
        .from("task_participants")
        .select("status")
        .eq("task_id", taskId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("task_watchers")
        .select("task_id")
        .eq("task_id", taskId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("task_participants")
        .select("user_id, status, profiles!task_participants_user_id_fkey(nickname)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
    ]);

  if (overviewResult.error) throw overviewResult.error;
  if (!overviewResult.data) return null;

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

  return { task, participants };
}
