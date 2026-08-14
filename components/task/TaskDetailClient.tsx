"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/common/AppChrome";
import { createClient } from "@/lib/supabase/client";
import { ParticipationSelector } from "./ParticipationSelector";
import { TaskProgress } from "./TaskProgress";
import {
  categoryMap,
  formatMeetDate,
  type Participant,
  type ParticipationStatus,
  type TaskSummary,
} from "./types";

async function copyShareText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Some in-app browsers expose Clipboard API but block write access.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

export function TaskDetailClient({
  taskId,
  viewerId,
  viewerName,
  initialTask,
  initialParticipants,
}: {
  taskId: string;
  viewerId: string;
  viewerName: string;
  initialTask: TaskSummary;
  initialParticipants: Participant[];
}) {
  const router = useRouter();
  const [task, setTask] = useState<TaskSummary>(initialTask);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
        const data = (await response.json()) as {
          task?: TaskSummary;
          participants?: Participant[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error);
        if (!active) return;
        if (data.task) setTask(data.task);
        setParticipants(data.participants ?? []);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "불러오지 못했어요.");
        }
      }
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_participants", filter: `task_id=eq.${taskId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `id=eq.${taskId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [taskId]);

  async function participate(status: Exclude<ParticipationStatus, null>) {
    if (task.myStatus === status) return;
    const previousTask = task;
    const previousParticipants = participants;
    const joinedDelta =
      task.myStatus === "JOINED" && status !== "JOINED"
        ? -1
        : task.myStatus !== "JOINED" && status === "JOINED"
          ? 1
          : 0;
    setBusy(true);
    setError("");
    setTask((current) => ({
      ...current,
      myStatus: status,
      joinedCount: Math.max(0, current.joinedCount + joinedDelta),
    }));
    setParticipants((current) => {
      const exists = current.some((person) => person.id === viewerId);
      if (exists) {
        return current.map((person) =>
          person.id === viewerId ? { ...person, status } : person,
        );
      }
      return [...current, { id: viewerId, nickname: viewerName, status }];
    });
    try {
      const response = await fetch(`/api/tasks/${task.id}/participation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { joinedCount?: number; error?: string };
      if (!response.ok) throw new Error(data.error);
      setTask((current) => ({
        ...current,
        joinedCount: data.joinedCount ?? current.joinedCount,
      }));
    } catch (participateError) {
      setTask(previousTask);
      setParticipants(previousParticipants);
      setError(participateError instanceof Error ? participateError.message : "변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleWatch() {
    const next = !task.watching;
    const previousTask = task;
    setBusy(true);
    setError("");
    setTask((current) => ({ ...current, watching: next }));
    try {
      const response = await fetch(`/api/tasks/${task.id}/watch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ watching: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);

      let notificationDenied = false;
      if (next && "Notification" in window && Notification.permission === "default") {
        notificationDenied = (await Notification.requestPermission()) === "denied";
      }
      if (notificationDenied) {
        setError("앱 안에서는 계속 볼 수 있지만 브라우저 알림은 꺼져 있어요.");
      } else if (next && "Notification" in window && Notification.permission === "granted") {
        try {
          if (!("serviceWorker" in navigator)) throw new Error("unsupported");
          const registration = await navigator.serviceWorker.register("/sw.js");
          await registration.showNotification("모임 알림을 켰어요", {
            body: `${task.title} 소식을 알려드릴게요.`,
            tag: `watch-${task.id}`,
          });
        } catch {
          setError("모임 알림은 켰지만, 이 브라우저에서는 알림 창을 띄울 수 없어요.");
        }
      }
    } catch (watchError) {
      setTask(previousTask);
      setError(watchError instanceof Error ? watchError.message : "알림을 변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function changeTaskState(action: "CANCELLED" | "COMPLETED") {
    const message =
      action === "CANCELLED"
        ? "이 모임을 취소할까요? 목록에서 사라지고 참여할 수 없게 됩니다."
        : "이 모임을 종료할까요? 종료하면 더 이상 참여 응답을 받을 수 없습니다.";
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
      router.push("/");
    } catch (stateError) {
      setError(stateError instanceof Error ? stateError.message : "변경하지 못했어요.");
      setBusy(false);
    }
  }

  async function shareTask() {
    const shareUrl = `${window.location.origin}/tasks/${task.id}`;
    const date = formatMeetDate(task.startAt);
    const message = `${task.title}\n${date.day} ${date.time}\n링크를 열고 로그인하면 바로 모임을 볼 수 있어요.`;

    setError("");
    setShareState("idle");

    if (navigator.share) {
      try {
        await navigator.share({
          title: `모임 · ${task.title}`,
          text: message,
          url: shareUrl,
        });
        setShareState("shared");
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }

    try {
      await copyShareText(`${message}\n${shareUrl}`);
      setShareState("copied");
    } catch {
      setError("공유 링크를 복사하지 못했어요. 잠시 뒤 다시 눌러 주세요.");
    }
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
    <AppChrome
      title="모임 상세"
      eyebrow={`${category.emoji} ${category.label}`}
      backHref="/"
      action={
        <button
          className={`header-share${shareState !== "idle" ? " done" : ""}`}
          type="button"
          onClick={shareTask}
          aria-label="이 모임 공유하기"
        >
          {shareState === "copied" ? "복사됨" : shareState === "shared" ? "공유됨" : "공유"}
        </button>
      }
    >
      <div className="detail-page">
        <div className="share-status" role="status" aria-live="polite">
          {shareState === "copied"
            ? "링크를 복사했어요. 카톡에 붙여넣으세요."
            : shareState === "shared"
              ? "공유했어요."
              : ""}
        </div>
        <section className="detail-hero-card">
          <div className="detail-date">
            <strong>{date.day}</strong>
            <span>{date.time}</span>
          </div>
          <h1>{task.title}</h1>
          <p className="detail-creator">{task.creatorNickname}님이 열었어요</p>
          {task.status === "OPEN" && (
            <div className="hero-response">
              <div className="hero-response-heading">
                <strong>이 모임에 참여할까요?</strong>
                <span>선택하면 바로 반영됩니다</span>
              </div>
              <ParticipationSelector value={task.myStatus} onChange={participate} disabled={busy} />
            </div>
          )}
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
            <Link className="secondary-button" href={`/tasks/${task.id}/edit`}>모임 수정</Link>
            <button type="button" onClick={() => changeTaskState("COMPLETED")} disabled={busy}>모임 종료</button>
            <button type="button" className="danger-link" onClick={() => changeTaskState("CANCELLED")} disabled={busy}>모임 취소</button>
          </section>
        )}
      </div>
    </AppChrome>
  );
}
