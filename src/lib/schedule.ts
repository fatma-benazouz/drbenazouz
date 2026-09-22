export const TZ = "Africa/Johannesburg";

export type AvailabilityRule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  active: boolean;
};

export type AvailabilityException = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

export type TakenSlot = { requested_date: string; requested_time: string; status: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in Africa/Johannesburg as YYYY-MM-DD. */
export function todaySast(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Current time in Africa/Johannesburg as minutes past midnight. */
export function nowMinutesSast(): number {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function parseISO(isoDate: string): [number, number, number] {
  const parts = isoDate.split("-").map(Number);
  return [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = parseISO(isoDate);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function dayOfWeek(isoDate: string): number {
  const [y, m, d] = parseISO(isoDate);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatLongDate(isoDate: string): string {
  const [y, m, d] = parseISO(isoDate);
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatShortDate(isoDate: string) {
  const [y, m, d] = parseISO(isoDate);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    weekday: new Intl.DateTimeFormat("en-ZA", { weekday: "short", timeZone: "UTC" }).format(dt),
    day: new Intl.DateTimeFormat("en-ZA", { day: "numeric", timeZone: "UTC" }).format(dt),
    month: new Intl.DateTimeFormat("en-ZA", { month: "short", timeZone: "UTC" }).format(dt),
  };
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const toTime = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

export function formatTimeLabel(time: string) {
  return time.slice(0, 5);
}

export type Slot = { time: string; available: boolean };

const BLOCKING_STATUSES = new Set(["pending", "confirmed", "rescheduled"]);

/** All slots for a date, flagged available/unavailable. Returns [] if the practice is closed. */
export function slotsForDate(
  isoDate: string,
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
  taken: TakenSlot[],
): Slot[] {
  const dow = dayOfWeek(isoDate);
  const dayRules = rules.filter((r) => r.active && r.day_of_week === dow);
  if (dayRules.length === 0) return [];

  const dayExceptions = exceptions.filter((e) => e.date === isoDate);
  // A full-day block removes the date entirely.
  if (dayExceptions.some((e) => !e.start_time || !e.end_time)) return [];

  const blocked = dayExceptions.map((e) => [toMinutes(e.start_time!), toMinutes(e.end_time!)] as const);
  const takenTimes = new Set(
    taken
      .filter((t) => t.requested_date === isoDate && BLOCKING_STATUSES.has(t.status))
      .map((t) => t.requested_time.slice(0, 5)),
  );

  const isToday = isoDate === todaySast();
  const cutoff = isToday ? nowMinutesSast() + 60 : -1;

  const slots: Slot[] = [];
  for (const rule of dayRules) {
    const start = toMinutes(rule.start_time);
    const end = toMinutes(rule.end_time);
    const step = rule.slot_duration_minutes || 30;
    for (let m = start; m + step <= end; m += step) {
      const time = toTime(m);
      if (slots.some((s) => s.time === time)) continue;
      const inBlocked = blocked.some(([bs, be]) => m < be && m + step > bs);
      const available = !inBlocked && !takenTimes.has(time) && m > cutoff;
      slots.push({ time, available });
    }
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
