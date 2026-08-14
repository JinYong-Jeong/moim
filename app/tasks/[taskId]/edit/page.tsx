import { redirect } from "next/navigation";
import { EditTaskClient } from "@/components/task/EditTaskClient";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const user = await getAppUser();
  if (!user) redirect("/login");
  const { taskId } = await params;
  return <EditTaskClient taskId={taskId} />;
}
