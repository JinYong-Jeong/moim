"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/common/AppChrome";
import { TaskCard } from "@/components/task/TaskCard";
import type {
  ParticipationStatus,
  TaskSummary,
} from "@/components/task/types";
import { koreaRelativeDay } from "@/lib/korea-time";

type Profile = { id: string; nickname: string };
type LeaveRequest = {
  task: TaskSummary;
  status: Exclude<ParticipationStatus, null>;
} | null;

const leaveReasons = ["일정이 생겼어요", "다른 약속이 있어요", "인원이 부족해 보여요"];

function groupKey(task: TaskSummary) {
  if (task.status === "COMPLETED") return "완료";
  return koreaRelativeDay(new Date(task.startAt)) ?? "예정";
}

export function HomeClient({
  profile,
  initialTasks,
}: {
  profile: Profile;
  initialTasks: TaskSummary[];
}) {
  const [tasks, setTasks] = useState<TaskSummary[]>(initialTasks);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest>(null);
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

  }, []);

  const groups = useMemo(() => {
    const result: Record<string, TaskSummary[]> = {
      "알림 켠 모임": [],
      오늘: [],
      내일: [],
      예정: [],
      완료: [],
    };
    for (const task of tasks) {
      if (task.status === "OPEN" && Boolean(task.watching)) {
        result["알림 켠 모임"].push(task);
      } else {
        result[groupKey(task)].push(task);
      }
    }
    return result;
  }, [tasks]);

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
        <div className="sheet-backdrop">
          <button
            type="button"
            className="sheet-dismiss"
            aria-label="참여 변경 창 닫기"
            onClick={() => setLeaveRequest(null)}
          />
          <section
            className="bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
          >
            <div className="sheet-handle" />
            <h2 id="leave-title">참여를 변경할까요?</h2>
            <p>이유는 선택이에요. 친구들이 계획할 때 도움이 돼요.</p>
            <div className="reason-chips">
              {leaveReasons.map((reason) => (
                <button
                  type="button"
                  className={leaveReason === reason ? "selected" : ""}
                  onClick={() => setLeaveReason(reason)}
                  key={reason}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="sheet-actions">
              <button type="button" className="secondary-button" onClick={() => setLeaveRequest(null)}>
                그대로 참여
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => updateParticipation(leaveRequest.task, leaveRequest.status, leaveReason)}
              >
                변경하기
              </button>
            </div>
          </section>
        </div>
      )}
    </AppChrome>
  );
}
