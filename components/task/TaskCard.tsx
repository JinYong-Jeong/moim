import Link from "next/link";
import { ParticipationSelector } from "./ParticipationSelector";
import { TaskProgress } from "./TaskProgress";
import {
  categoryMap,
  type ParticipationStatus,
  type TaskSummary,
} from "./types";
import { formatMeetCountdown, hasDatePassed } from "@/lib/korea-time";

export function TaskCard({
  task,
  onParticipation,
  now,
  busy,
}: {
  task: TaskSummary;
  onParticipation: (
    task: TaskSummary,
    status: Exclude<ParticipationStatus, null>,
  ) => void;
  now: number;
  busy?: boolean;
}) {
  const category = categoryMap[task.category] ?? categoryMap.ETC;
  const startAt = new Date(task.startAt);
  const currentTime = new Date(now);
  const past = task.status === "OPEN" && hasDatePassed(startAt, currentTime);
  const countdown = formatMeetCountdown(startAt, currentTime);
  const canParticipate = task.status === "OPEN" && !past;
  const closed = task.status !== "OPEN" || past;

  return (
    <article className={`task-card${closed ? " completed" : ""}`}>
      <div className="task-card-topline">
        <span className="category-pill">
          <span aria-hidden="true">{category.emoji}</span> {category.label}
        </span>
        {Boolean(task.watching) && <span className="watching-mark">● 알림 켬</span>}
      </div>
      <Link href={`/tasks/${task.id}`} className="task-card-link">
        <div className="task-card-heading">
          <div>
            <h3>{task.title}</h3>
            <p>{task.creatorNickname}님이 열었어요</p>
          </div>
          <div
            className={`task-time${countdown.past ? " past" : ""}`}
            aria-label={`${countdown.amount} ${countdown.label}`}
          >
            <strong>{countdown.amount}</strong>
            <span>{countdown.label}</span>
          </div>
        </div>
        <TaskProgress task={task} past={past} />
      </Link>
      {canParticipate && (
        <div className="card-response">
          <div className="card-response-heading">
            <strong>참여 여부</strong>
            <span>{task.myStatus ? "언제든 바꿀 수 있어요" : "바로 알려주세요"}</span>
          </div>
          <ParticipationSelector
            compact
            value={task.myStatus}
            onChange={(status) => onParticipation(task, status)}
            disabled={busy}
          />
        </div>
      )}
      {closed && (
        <p className="closed-response">
          {past ? "지난 모임 · 참여 응답 마감" : "종료된 모임 · 참여 응답 마감"}
        </p>
      )}
    </article>
  );
}
