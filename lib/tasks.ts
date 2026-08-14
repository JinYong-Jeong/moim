export const TASK_CATEGORIES = [
  "GAME",
  "FOOD",
  "SPORT",
  "STUDY",
  "DRINK",
  "ETC",
] as const;

export const PARTICIPATION_STATUSES = ["JOINED", "MAYBE", "DECLINED"] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export function isTaskCategory(value: unknown): value is TaskCategory {
  return TASK_CATEGORIES.includes(value as TaskCategory);
}

export function isParticipationStatus(
  value: unknown,
): value is ParticipationStatus {
  return PARTICIPATION_STATUSES.includes(value as ParticipationStatus);
}

export function parseTaskPayload(payload: Record<string, unknown>) {
  const title = String(payload.title ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const category = payload.category;
  const startAt = String(payload.startAt ?? "");
  const deadlineAt = payload.deadlineAt ? String(payload.deadlineAt) : null;
  const joinUrl = String(payload.joinUrl ?? "").trim();
  const minParticipants = Number(payload.minParticipants);
  const maxParticipants = Number(payload.maxParticipants);

  if (!title || title.length > 60) {
    throw new Error("제목은 1~60자로 입력해 주세요.");
  }
  if (!isTaskCategory(category)) {
    throw new Error("카테고리를 선택해 주세요.");
  }
  if (!Number.isInteger(minParticipants) || minParticipants < 1) {
    throw new Error("최소 인원은 1명 이상이어야 해요.");
  }
  if (
    !Number.isInteger(maxParticipants) ||
    maxParticipants < minParticipants ||
    maxParticipants > 100
  ) {
    throw new Error("최대 인원을 다시 확인해 주세요.");
  }

  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime()) || startDate.getTime() <= Date.now()) {
    throw new Error("시작 시간은 현재보다 뒤여야 해요.");
  }

  let deadlineDate: Date | null = null;
  if (deadlineAt) {
    deadlineDate = new Date(deadlineAt);
    if (
      Number.isNaN(deadlineDate.getTime()) ||
      deadlineDate.getTime() > startDate.getTime()
    ) {
      throw new Error("모집 마감은 시작 시간보다 늦을 수 없어요.");
    }
  }

  if (joinUrl) {
    try {
      new URL(joinUrl);
    } catch {
      throw new Error("참여 링크를 확인해 주세요.");
    }
  }

  return {
    title,
    description: description || null,
    category,
    startAt: startDate.toISOString(),
    deadlineAt: deadlineDate?.toISOString() ?? null,
    minParticipants,
    maxParticipants,
    joinUrl: joinUrl || null,
  };
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
  const status = message.includes("찾을 수") ? 404 : 400;
  return Response.json({ error: message }, { status });
}
