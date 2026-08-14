"use client";

import { useId } from "react";

const leaveReasons = [
  "일정이 생겼어요",
  "다른 약속이 있어요",
  "인원이 부족해 보여요",
];

export function ParticipationChangeSheet({
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  busy = false,
}: {
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const titleId = useId();

  return (
    <div className="sheet-backdrop">
      <button
        type="button"
        className="sheet-dismiss"
        aria-label="참여 변경 창 닫기"
        onClick={onCancel}
      />
      <section
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="sheet-handle" />
        <h2 id={titleId}>참여를 변경할까요?</h2>
        <p>이유는 선택이에요. 친구들이 계획할 때 도움이 돼요.</p>
        <div className="reason-chips">
          {leaveReasons.map((option) => (
            <button
              type="button"
              className={reason === option ? "selected" : ""}
              onClick={() => onReasonChange(option)}
              key={option}
            >
              {option}
            </button>
          ))}
        </div>
        <label className="reason-input">
          <span>직접 입력</span>
          <input
            value={reason}
            onChange={(event) => onReasonChange(event.target.value.slice(0, 100))}
            placeholder="예: 조금 늦을 것 같아요"
            maxLength={100}
          />
          <small>{reason.length}/100</small>
        </label>
        <div className="sheet-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={busy}
          >
            그대로 참여
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "변경 중…" : "변경하기"}
          </button>
        </div>
      </section>
    </div>
  );
}
