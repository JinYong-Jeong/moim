export const KOREA_TIME_ZONE = "Asia/Seoul";

const KOREA_OFFSET = "+09:00";
const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DATE_TIME_INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const inputFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parts(date: Date, formatter: Intl.DateTimeFormat) {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function currentTimestamp() {
  return Date.now();
}

export function toKoreaDateTimeInput(date: Date) {
  const value = parts(date, inputFormatter);
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

export function parseKoreaDateTimeInput(value: string) {
  const match = DATE_TIME_INPUT_PATTERN.exec(value);
  if (!match) return new Date(Number.NaN);

  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${KOREA_OFFSET}`,
  );
  if (Number.isNaN(date.getTime())) return date;

  const normalized = `${year}-${month}-${day}T${hour}:${minute}`;
  return toKoreaDateTimeInput(date) === normalized
    ? date
    : new Date(Number.NaN);
}

export function koreaDateKey(date: Date) {
  const value = parts(date, dateKeyFormatter);
  return `${value.year}-${value.month}-${value.day}`;
}

export function koreaRelativeDay(date: Date, now = new Date()) {
  const key = koreaDateKey(date);
  if (key === koreaDateKey(now)) return "오늘";
  if (key === koreaDateKey(new Date(now.getTime() + DAY_IN_MS))) return "내일";
  return null;
}

export function hasDatePassed(date: Date, now = new Date()) {
  return date.getTime() <= now.getTime();
}

export function formatMeetCountdown(date: Date, now = new Date()) {
  const difference = date.getTime() - now.getTime();
  const absolute = Math.abs(difference);
  const past = difference <= 0;

  if (absolute < MINUTE_IN_MS) {
    return past
      ? { amount: "방금", label: "지남", past }
      : { amount: "곧", label: "시작", past };
  }

  const unit =
    absolute < HOUR_IN_MS
      ? { size: MINUTE_IN_MS, label: "분" }
      : absolute < DAY_IN_MS
        ? { size: HOUR_IN_MS, label: "시간" }
        : { size: DAY_IN_MS, label: "일" };
  const value = Math.max(1, Math.floor(absolute / unit.size));

  return {
    amount: `${value}${unit.label}`,
    label: past ? "지남" : "남음",
    past,
  };
}
