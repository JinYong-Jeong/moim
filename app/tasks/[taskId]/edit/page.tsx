import { notFound, redirect } from "next/navigation";
import { CreateTaskForm } from "@/components/task/CreateTaskForm";
import { getAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTaskDetail } from "@/lib/task-queries";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const user = await getAppUser();
  if (!user) redirect("/login");
  const { taskId } = await params;
  const supabase = await createClient();
  const detail = await loadTaskDetail(supabase, user.id, taskId);
  if (!detail) notFound();
  if (detail.task.creatorId !== user.id) redirect(`/tasks/${taskId}`);
  return <CreateTaskForm initial={detail.task} />;
}
