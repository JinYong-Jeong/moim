import { notFound, redirect } from "next/navigation";
import { TaskDetailClient } from "@/components/task/TaskDetailClient";
import { getAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTaskDetail } from "@/lib/task-queries";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const user = await getAppUser();
  if (!user) redirect("/login");
  const { taskId } = await params;
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
