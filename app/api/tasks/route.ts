import { getAppUser, unauthorized } from "@/lib/auth";
import { apiError, parseTaskPayload } from "@/lib/tasks";
import { databaseError } from "@/lib/task-data";
import { createClient } from "@/lib/supabase/server";
import { loadTaskList } from "@/lib/task-queries";

export async function GET() {
  const user = await getAppUser();
  if (!user) return unauthorized();

  const supabase = await createClient();
  try {
    return Response.json({ tasks: await loadTaskList(supabase, user.id) });
  } catch (error) {
    return databaseError(error, "모임을 불러오지 못했어요.");
  }
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
