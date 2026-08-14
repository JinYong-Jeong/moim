import type { ParticipationStatus, TaskSummary } from "@/components/task/types";

export type TaskOverviewRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  start_at: string;
  deadline_at: string | null;
  min_participants: number;
  max_participants: number;
  join_url: string | null;
  status: TaskSummary["status"];
  creator_id: string;
  creator_nickname: string;
  joined_count: number;
};

export function toTaskSummary(
  row: TaskOverviewRow,
  myStatus: ParticipationStatus = null,
  watching = false,
): TaskSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    startAt: row.start_at,
    deadlineAt: row.deadline_at,
    minParticipants: row.min_participants,
    maxParticipants: row.max_participants,
    joinUrl: row.join_url,
    status: row.status,
    creatorId: row.creator_id,
    creatorNickname: row.creator_nickname,
    joinedCount: Number(row.joined_count ?? 0),
    myStatus,
    watching,
  };
}

export function databaseError(error: unknown, fallback = "요청을 처리하지 못했어요.") {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : fallback;
  const knownMessages = [
    "로그인이 필요해요.",
    "가입 후 이용해 주세요.",
    "닉네임은 2~20자로 입력해 주세요.",
    "사용할 수 없는 초대 코드예요.",
    "시작 시간은 현재보다 뒤여야 해요.",
    "모임을 찾을 수 없어요.",
    "종료된 모임이에요.",
    "모집이 마감되었어요.",
    "현재 모집이 완료되었습니다.",
    "참여 상태를 확인해 주세요.",
  ];
  const friendly = knownMessages.find((value) => message.includes(value)) ?? fallback;
  return Response.json(
    { error: friendly },
    { status: friendly === "모임을 찾을 수 없어요." ? 404 : 400 },
  );
}
