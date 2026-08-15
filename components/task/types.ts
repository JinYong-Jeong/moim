import { KOREA_TIME_ZONE, koreaRelativeDay } from "@/lib/korea-time";

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

export function getMeetStatus(task: TaskSummary, past = false) {
  const spotsLeft = Math.max(0, task.maxParticipants - task.joinedCount);

  if (task.status === "COMPLETED") {
    return { key: "COMPLETED", label: "완료", message: "즐거운 모임이었어요" };
  }
  if (past) {
    return { key: "PAST", label: "지남", message: "모임 시간이 지났어요" };
  }
  if (task.joinedCount >= task.maxParticipants) {
    return { key: "FULL", label: "FULL", message: "모집 완료!" };
  }
  if (task.joinedCount >= task.minParticipants) {
    return {
      key: "READY",
      label: "성공",
      message: `모임 확정 · ${spotsLeft}자리 남음`,
    };
  }
  const remainingToStart = task.minParticipants - task.joinedCount;
  return {
    key: "WAITING",
    label: "모집 중",
    message: `시작까지 ${remainingToStart}명 · ${spotsLeft}자리 남음`,
  };
}

export function formatMeetDate(value: string) {
  const date = new Date(value);
  const day =
    koreaRelativeDay(date) ??
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: KOREA_TIME_ZONE,
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(date);
  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KOREA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return { day, time };
}
