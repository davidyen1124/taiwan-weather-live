const TZ = "Asia/Taipei";

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
  hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Wall-clock parts in Taiwan time. */
export function taipei(value: string | number | Date = Date.now()): Parts {
  const date = value instanceof Date ? value : new Date(value);
  const get = (type: string) => partsFormatter.formatToParts(date).find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(get("year")), month: Number(get("month")), day: Number(get("day")),
    hour: Number(get("hour")) % 24, minute: Number(get("minute")), weekday: WEEKDAYS.indexOf(get("weekday")),
  };
}

export const WEEKDAY_SHORT = ["日", "一", "二", "三", "四", "五", "六"];

const pad = (n: number) => String(n).padStart(2, "0");
export const hhmm = (value?: string | null) => {
  if (!value) return "--";
  const p = taipei(value);
  return `${pad(p.hour)}:${pad(p.minute)}`;
};

/** "2026-09-28" style date key in Taiwan time. */
export const dateKey = (value: string | number | Date) => {
  const p = taipei(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
};

/** A calendar date string (yyyy-mm-dd) interpreted at noon Taiwan time. */
export const fromDateKey = (key: string) => new Date(`${key}T12:00:00+08:00`);

const dayPeriodFormatter = new Intl.DateTimeFormat("zh-TW", { timeZone: TZ, hour: "numeric", dayPeriod: "short" });

/** Hourly strip label: 現在 / MM/DD at midnight / 晚上 11 時. */
export function hourLabel(time: string, index: number) {
  if (index === 0) return "現在";
  const p = taipei(time);
  if (p.hour === 0) return `${pad(p.month)}/${pad(p.day)}`;
  const text = dayPeriodFormatter.format(new Date(time)); // e.g. 晚上11時
  const match = text.match(/^(\D+)(\d+)時$/);
  return match ? `${match[1]} ${match[2]} 時` : text;
}

export const weekdayName = (key: string) => `週${WEEKDAY_SHORT[taipei(fromDateKey(key)).weekday]}`;
export const monthDay = (key: string) => {
  const p = taipei(fromDateKey(key));
  return `${p.month}月${p.day}日`;
};
export const fullDate = (key: string) => {
  const p = taipei(fromDateKey(key));
  return `${p.year}年 ${p.month}月 ${p.day}日 星期${WEEKDAY_SHORT[p.weekday]}`;
};

export function windDirectionText(degrees: number | null) {
  if (degrees === null) return "--";
  const labels = ["北風", "東北風", "東風", "東南風", "南風", "西南風", "西風", "西北風"];
  return labels[Math.round(degrees / 45) % 8];
}

export function relativePublished(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "剛剛發布";
  if (minutes < 60) return `${minutes}分鐘前發布`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小時前發布`;
  return `${Math.floor(hours / 24)}天前發布`;
}

export const minutesOfDay = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};
