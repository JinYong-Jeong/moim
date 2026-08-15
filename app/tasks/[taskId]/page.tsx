import { notFound, redirect } from "next/navigation";
import { TaskDetailClient } from "@/components/task/TaskDetailClient";
import { getAppUser } from "@/lib/auth";
import { loginPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadTaskDetail } from "@/lib/task-queries";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const [user, { taskId }] = await Promise.all([getAppUser(), params]);
  if (!user) redirect(loginPath(`/tasks/${taskId}`));
  const supabase = await createClient();
  const detail = await loadTaskDetail(supabase, user.id, taskId);
  if (!detail) notFound();
  return (
    <TaskDetailClient
      taskId={taskId}
      viewerId={user.id}
      viewerName={user.displayName}
      initialTask={detail.task}
      initialParticipants={detail.participants}
    />
  );
}
