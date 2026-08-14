export const KOREA_TIME_ZONE = "Asia/Seoul";

const KOREA_OFFSET = "+09:00";
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
