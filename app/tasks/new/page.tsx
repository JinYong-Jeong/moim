import { redirect } from "next/navigation";
import { CreateTaskForm } from "@/components/task/CreateTaskForm";
import { getAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const user = await getAppUser();
  if (!user) redirect("/login");
  return <CreateTaskForm />;
}
