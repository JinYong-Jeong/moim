import type { ParticipationStatus } from "./types";

const options = [
  { value: "JOINED", label: "참여", icon: "✓" },
  { value: "MAYBE", label: "고민중", icon: "?" },
  { value: "DECLINED", label: "불참", icon: "×" },
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
    <div className={`participation-selector${compact ? " compact" : ""}`}>
      {options.map((option) => (
        <button
          type="button"
          className={value === option.value ? "selected" : ""}
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          key={option.value}
        >
          <span aria-hidden="true">{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}
