import { HomeClient } from "@/components/home/HomeClient";
import { LoginLanding } from "@/components/common/LoginLanding";
import { getAppUser } from "@/lib/auth";
import { currentTimestamp } from "@/lib/korea-time";
import { createClient } from "@/lib/supabase/server";
import { loadTaskList } from "@/lib/task-queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAppUser();
  if (!user) return <LoginLanding />;

  const supabase = await createClient();
  const tasks = await loadTaskList(supabase, user.id);
  return (
    <HomeClient
      profile={{ id: user.id, nickname: user.displayName }}
      initialTasks={tasks}
      initialNow={currentTimestamp()}
    />
  );
}
