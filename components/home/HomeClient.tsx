"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/common/AppChrome";
import { ParticipationChangeSheet } from "@/components/task/ParticipationChangeSheet";
import { TaskCard } from "@/components/task/TaskCard";
import type {
  ParticipationStatus,
  TaskSummary,
} from "@/components/task/types";
import { hasDatePassed, koreaRelativeDay } from "@/lib/korea-time";

type Profile = { id: string; nickname: string };
type LeaveRequest = {
  task: TaskSummary;
  status: Exclude<ParticipationStatus, null>;
} | null;

function groupKey(task: TaskSummary, now: number) {
  if (task.status === "COMPLETED") return "완료";
  const startAt = new Date(task.startAt);
  const currentTime = new Date(now);
  if (hasDatePassed(startAt, currentTime)) return "지난 모임";
  return koreaRelativeDay(startAt, currentTime) ?? "예정";
}

export function HomeClient({
  profile,
  initialTasks,
  initialNow,
}: {
  profile: Profile;
  initialTasks: TaskSummary[];
  initialNow: number;
}) {
  const [tasks, setTasks] = useState<TaskSummary[]>(initialTasks);
  const [now, setNow] = useState(initialNow);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest>(null);
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const groups = useMemo(() => {
    const result: Record<string, TaskSummary[]> = {
      "알림 켠 모임": [],
      오늘: [],
      내일: [],
      예정: [],
      완료: [],
      "지난 모임": [],
    };
    for (const task of tasks) {
      const key = groupKey(task, now);
      if (key !== "지난 모임" && task.status === "OPEN" && Boolean(task.watching)) {
        result["알림 켠 모임"].push(task);
      } else {
        result[key].push(task);
      }
    }
    result["지난 모임"].sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
    return result;
  }, [now, tasks]);

  async function updateParticipation(
    task: TaskSummary,
    status: Exclude<ParticipationStatus, null>,
    reason?: string,
  ) {
    if (task.myStatus === status) return;
    const previousTasks = tasks;
    const joinedDelta =
      task.myStatus === "JOINED" && status !== "JOINED"
        ? -1
        : task.myStatus !== "JOINED" && status === "JOINED"
          ? 1
          : 0;
    setBusyId(task.id);
    setError("");
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              myStatus: status,
              joinedCount: Math.max(0, item.joinedCount + joinedDelta),
            }
          : item,
      ),
    );

    try {
      const response = await fetch(`/api/tasks/${task.id}/participation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const data = (await response.json()) as {
        joinedCount?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, joinedCount: data.joinedCount ?? item.joinedCount }
            : item,
        ),
      );
    } catch (updateError) {
      setTasks(previousTasks);
      setError(updateError instanceof Error ? updateError.message : "변경하지 못했어요.");
    } finally {
      setBusyId(null);
      setLeaveRequest(null);
      setLeaveReason("");
    }
  }

  function chooseParticipation(
    task: TaskSummary,
    status: Exclude<ParticipationStatus, null>,
  ) {
    if (task.myStatus === "JOINED" && status !== "JOINED") {
      setLeaveRequest({ task, status });
      return;
    }
    void updateParticipation(task, status);
  }

  function closeLeaveSheet() {
    setLeaveRequest(null);
    setLeaveReason("");
  }

  return (
    <AppChrome>
      <div className="home-hero">
        <div>
          <p>{profile.nickname}님</p>
          <h1>오늘 뭐 할까요?</h1>
        </div>
        <Link href="/tasks/new" className="hero-create">
          <span>＋</span> 모임 만들기
        </Link>
      </div>

      {error && <div className="inline-alert" role="alert">{error}</div>}

      {tasks.length === 0 ? (
        <section className="empty-state">
          <h2>첫 모임을 열어볼까요?</h2>
          <p>제목과 시간, 인원만 정하면 끝이에요.</p>
          <Link href="/tasks/new" className="primary-button">모임 만들기</Link>
        </section>
      ) : (
        <div className="task-groups">
          {Object.entries(groups).map(([label, items]) =>
            items.length ? (
              <section className="task-group" key={label}>
                <div className="section-heading">
                  <h2>{label}</h2>
                  <span>{items.length}</span>
                </div>
                <div className="task-list">
                  {items.map((task) => (
                    <TaskCard
                      task={task}
                      now={now}
                      busy={busyId === task.id}
                      onParticipation={chooseParticipation}
                      key={task.id}
                    />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}

      {leaveRequest && (
        <ParticipationChangeSheet
          reason={leaveReason}
          onReasonChange={setLeaveReason}
          onCancel={closeLeaveSheet}
          onConfirm={() =>
            updateParticipation(
              leaveRequest.task,
              leaveRequest.status,
              leaveReason,
            )
          }
          busy={busyId === leaveRequest.task.id}
        />
      )}
    </AppChrome>
  );
}
