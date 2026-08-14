import { getAppUser, unauthorized } from "@/lib/auth";
import { databaseError } from "@/lib/task-data";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getAppUser();
  if (!user) return unauthorized();
  const { taskId } = await context.params;
  const payload = (await request.json()) as { watching?: boolean };
  const supabase = await createClient();

  if (payload.watching) {
    const { error } = await supabase
      .from("task_watchers")
      .upsert(
        { task_id: taskId, user_id: user.id },
        { onConflict: "task_id,user_id", ignoreDuplicates: true },
      );
    if (error) return databaseError(error, "알림을 켜지 못했어요.");
  } else {
    const { error } = await supabase
      .from("task_watchers")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", user.id);
    if (error) return databaseError(error, "알림을 끄지 못했어요.");
  }

  return Response.json({ watching: Boolean(payload.watching) });
}
