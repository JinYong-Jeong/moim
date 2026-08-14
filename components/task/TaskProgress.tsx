import { getMeetStatus, type TaskSummary } from "./types";

export function TaskProgress({ task }: { task: TaskSummary }) {
  const state = getMeetStatus(task);
  const ratio = Math.min(100, (task.joinedCount / task.maxParticipants) * 100);

  return (
    <div className="progress-wrap" aria-label={`${task.joinedCount}명 참여 중`}>
      <div className="progress-copy">
        <span className="progress-count">
          <strong>{task.joinedCount}</strong>
          <span> / {task.maxParticipants}</span>
        </span>
        <span className={`meet-status meet-status-${state.key.toLowerCase()}`}>
          {state.label}
        </span>
      </div>
      {task.maxParticipants <= 12 ? (
        <div className="progress-dots" aria-hidden="true">
          {Array.from({ length: task.maxParticipants }, (_, index) => (
            <span
              className={index < task.joinedCount ? "dot dot-filled" : "dot"}
              key={index}
            />
          ))}
        </div>
      ) : (
        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${ratio}%` }} />
        </div>
      )}
      <p className="progress-message">{state.message}</p>
    </div>
  );
}
