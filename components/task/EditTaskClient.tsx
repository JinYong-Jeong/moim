"use client";

import { useEffect, useState } from "react";
import { AppChrome } from "@/components/common/AppChrome";
import { CreateTaskForm } from "./CreateTaskForm";
import type { TaskSummary } from "./types";

export function EditTaskClient({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<TaskSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { task?: TaskSummary; error?: string };
        if (!response.ok) throw new Error(data.error);
        setTask(data.task ?? null);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "불러오지 못했어요."));
  }, [taskId]);

  if (task) return <CreateTaskForm initial={task} />;
  return (
    <AppChrome title="모임 수정" backHref={`/tasks/${taskId}`} hideNav>
      {error ? <div className="inline-alert detail-alert">{error}</div> : <div className="detail-loading"><span /></div>}
    </AppChrome>
  );
}
