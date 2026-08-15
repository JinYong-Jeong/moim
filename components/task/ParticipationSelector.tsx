import type { ParticipationStatus } from "./types";

const options = [
  { value: "JOINED", label: "참여하기" },
  { value: "MAYBE", label: "고민중" },
  { value: "DECLINED", label: "불참" },
] as const;

export function ParticipationSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: ParticipationStatus;
  onChange: (status: Exclude<ParticipationStatus, null>) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`participation-selector${compact ? " compact" : ""}${value ? " has-response" : ""}`}
      role="group"
      aria-label="참여 여부"
    >
      {options.map((option) => (
        <button
          type="button"
          className={`${option.value.toLowerCase()}${value === option.value ? " selected" : ""}`}
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          key={option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
