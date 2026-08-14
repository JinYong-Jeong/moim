export type ParticipationStatus = "JOINED" | "MAYBE" | "DECLINED" | null;

export type TaskSummary = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  startAt: string;
  deadlineAt: string | null;
  minParticipants: number;
  maxParticipants: number;
  joinUrl: string | null;
  status: "OPEN" | "CANCELLED" | "COMPLETED";
  creatorId: string;
  creatorNickname: string;
  joinedCount: number;
  myStatus: ParticipationStatus;
  watching: number | boolean;
};

export type Participant = {
  id: string;
  nickname: string;
  status: Exclude<ParticipationStatus, null>;
};

export const categoryMap: Record<string, { emoji: string; label: string }> = {
  GAME: { emoji: "🎮", label: "게임" },
  FOOD: { emoji: "🍜", label: "맛집" },
  SPORT: { emoji: "🏃", label: "운동" },
  STUDY: { emoji: "📚", label: "공부" },
  DRINK: { emoji: "🍻", label: "한잔" },
  ETC: { emoji: "✨", label: "기타" },
};

export function getMeetStatus(task: TaskSummary) {
  if (task.status === "COMPLETED") {
    return { key: "COMPLETED", label: "완료", message: "즐거운 모임이었어요" };
  }
  if (task.joinedCount >= task.maxParticipants) {
    return { key: "FULL", label: "FULL", message: "모집 완료!" };
  }
  if (task.joinedCount >= task.minParticipants) {
    return { key: "READY", label: "성공", message: "모임 확정!" };
  }
  const remaining = task.minParticipants - task.joinedCount;
  return {
    key: "WAITING",
    label: "모집 중",
    message: `${remaining}명만 더 오면 시작해요`,
  };
}

export function formatMeetDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const day = sameDay(date, today)
    ? "오늘"
    : sameDay(date, tomorrow)
      ? "내일"
      : new Intl.DateTimeFormat("ko-KR", {
          month: "short",
          day: "numeric",
          weekday: "short",
        }).format(date);
  const time = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return { day, time };
}
