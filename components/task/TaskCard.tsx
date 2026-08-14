import Link from "next/link";
import { ParticipationSelector } from "./ParticipationSelector";
import { TaskProgress } from "./TaskProgress";
import {
  categoryMap,
  formatMeetDate,
  type ParticipationStatus,
  type TaskSummary,
} from "./types";

export function TaskCard({
  task,
  onParticipation,
  busy,
}: {
  task: TaskSummary;
  onParticipation: (
    task: TaskSummary,
    status: Exclude<ParticipationStatus, null>,
  ) => void;
  busy?: boolean;
}) {
  const category = categoryMap[task.category] ?? categoryMap.ETC;
  const date = formatMeetDate(task.startAt);

  return (
    <article className={`task-card${task.status === "COMPLETED" ? " completed" : ""}`}>
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
          <div className="task-time">
            <strong>{date.day}</strong>
            <span>{date.time}</span>
          </div>
        </div>
        <TaskProgress task={task} />
      </Link>
      {task.status === "OPEN" && (
        <ParticipationSelector
          compact
          value={task.myStatus}
          onChange={(status) => onParticipation(task, status)}
          disabled={busy}
        />
      )}
    </article>
  );
}
