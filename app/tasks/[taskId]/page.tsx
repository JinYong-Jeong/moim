import { redirect } from "next/navigation";
import { TaskDetailClient } from "@/components/task/TaskDetailClient";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const user = await getAppUser();
  if (!user) redirect("/login");
  const { taskId } = await params;
  return <TaskDetailClient taskId={taskId} viewerId={user.id} />;
}
