"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/common/AppChrome";
import { ParticipationSelector } from "./ParticipationSelector";
import { TaskProgress } from "./TaskProgress";
import {
  categoryMap,
  formatMeetDate,
  type Participant,
  type ParticipationStatus,
  type TaskSummary,
} from "./types";

export function TaskDetailClient({ taskId, viewerId }: { taskId: string; viewerId: string }) {
  const [task, setTask] = useState<TaskSummary | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          task?: TaskSummary;
          participants?: Participant[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error);
        setTask(data.task ?? null);
        setParticipants(data.participants ?? []);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "불러오지 못했어요."),
      );
  }, [taskId]);

  async function participate(status: Exclude<ParticipationStatus, null>) {
    if (!task || task.myStatus === status) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}/participation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { joinedCount?: number; error?: string };
      if (!response.ok) throw new Error(data.error);
      setTask({ ...task, myStatus: status, joinedCount: data.joinedCount ?? task.joinedCount });
      const refreshed = await fetch(`/api/tasks/${task.id}`, { cache: "no-store" });
      const detail = (await refreshed.json()) as { participants: Participant[] };
      setParticipants(detail.participants ?? []);
    } catch (participateError) {
      setError(participateError instanceof Error ? participateError.message : "변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleWatch() {
    if (!task) return;
    const next = !Boolean(task.watching);
    setBusy(true);
    setError("");
    try {
      let notificationDenied = false;
      if (next && "Notification" in window && Notification.permission === "default") {
        notificationDenied = (await Notification.requestPermission()) === "denied";
      }
      const response = await fetch(`/api/tasks/${task.id}/watch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ watching: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setTask({ ...task, watching: next });
      if (notificationDenied) {
        setError("앱 안에서는 계속 볼 수 있지만 브라우저 알림은 꺼져 있어요.");
      } else if (next && "Notification" in window && Notification.permission === "granted") {
        new Notification("모임 알림을 켰어요", { body: `${task.title} 소식을 알려드릴게요.` });
      }
    } catch (watchError) {
      setError(watchError instanceof Error ? watchError.message : "알림을 변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function changeTaskState(action: "CANCELLED" | "COMPLETED") {
    if (!task) return;
    const message = action === "CANCELLED" ? "이 모임을 취소할까요?" : "모임을 완료할까요?";
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      window.location.href = "/";
    } catch (stateError) {
      setError(stateError instanceof Error ? stateError.message : "변경하지 못했어요.");
      setBusy(false);
    }
  }

  if (!task) {
    return (
      <AppChrome title="모임" backHref="/">
        {error ? <div className="inline-alert detail-alert">{error}</div> : <div className="detail-loading"><span /></div>}
      </AppChrome>
    );
  }

  const date = formatMeetDate(task.startAt);
  const category = categoryMap[task.category] ?? categoryMap.ETC;
  const grouped = {
    JOINED: participants.filter((person) => person.status === "JOINED"),
    MAYBE: participants.filter((person) => person.status === "MAYBE"),
    DECLINED: participants.filter((person) => person.status === "DECLINED"),
  };
  const isCreator = task.creatorId === viewerId;

  return (
    <AppChrome title="모임 상세" eyebrow={`${category.emoji} ${category.label}`} backHref="/">
      <div className="detail-page">
        <section className="detail-hero-card">
          <div className="detail-date">
            <strong>{date.day}</strong>
            <span>{date.time}</span>
          </div>
          <h1>{task.title}</h1>
          <p className="detail-creator">{task.creatorNickname}님이 열었어요</p>
          {task.description && <p className="detail-description">{task.description}</p>}
          <TaskProgress task={task} />
          <div className="detail-facts">
            <div><span>최소 인원</span><strong>{task.minParticipants}명</strong></div>
            <div><span>모집 마감</span><strong>{task.deadlineAt ? formatMeetDate(task.deadlineAt).time : "시작 전까지"}</strong></div>
          </div>
          {task.joinUrl && (
            <a className="join-link" href={task.joinUrl} target="_blank" rel="noreferrer">참여 링크 열기 ↗</a>
          )}
        </section>

        {error && <div className="inline-alert" role="alert">{error}</div>}

        {task.status === "OPEN" && (
          <section className="detail-section response-section">
            <div className="section-heading"><h2>나는 갈까요?</h2></div>
            <ParticipationSelector value={task.myStatus} onChange={participate} disabled={busy} />
          </section>
        )}

        <section className="detail-section">
          <div className="section-heading"><h2>친구들</h2><span>{participants.length}</span></div>
          {([
            ["JOINED", "참여", grouped.JOINED],
            ["MAYBE", "고민중", grouped.MAYBE],
            ["DECLINED", "불참", grouped.DECLINED],
          ] as const).map(([key, label, people]) =>
            people.length ? (
              <div className="participant-group" key={key}>
                <span>{label} · {people.length}</span>
                <div>{people.map((person) => <strong key={person.id}>{person.nickname}</strong>)}</div>
              </div>
            ) : null,
          )}
        </section>

        <button className={`watch-button${task.watching ? " active" : ""}`} type="button" onClick={toggleWatch} disabled={busy}>
          <span aria-hidden="true">{task.watching ? "●" : "○"}</span>
          <span><strong>{task.watching ? "알림 켜짐" : "이 모임 알림 켜기"}</strong><small>모집 성공·마감 소식을 놓치지 마세요</small></span>
        </button>

        {isCreator && task.status === "OPEN" && (
          <section className="creator-actions">
            <Link className="secondary-button" href={`/tasks/${task.id}/edit`}>수정</Link>
            <button type="button" onClick={() => changeTaskState("COMPLETED")} disabled={busy}>완료</button>
            <button type="button" className="danger-link" onClick={() => changeTaskState("CANCELLED")} disabled={busy}>취소</button>
          </section>
        )}
      </div>
    </AppChrome>
  );
}
