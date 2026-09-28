export const HOME_SECTIONS = ["aqi", "hourly", "daily", "observations", "sun"] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];
export const SECTION_LABELS: Record<HomeSection, string> = {
  aqi: "空氣品質", hourly: "逐小時預報", daily: "一週天氣", observations: "即時觀測", sun: "日出日落",
};
export type Preferences = {
  version: 1;
  theme: "system" | "light" | "dark";
  order: HomeSection[];
  hidden: HomeSection[];
  digest: boolean;
  digestTime: string;
  advisoryNotifications: boolean;
};
export const DEFAULT_PREFERENCES: Preferences = {
  version: 1, theme: "system", order: [...HOME_SECTIONS], hidden: [],
  digest: false, digestTime: "07:30", advisoryNotifications: false,
};
export function parsePreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object") return DEFAULT_PREFERENCES;
  const p = value as Partial<Preferences>;
  const valid = (v: unknown): v is HomeSection => HOME_SECTIONS.includes(v as HomeSection);
  const order = Array.isArray(p.order) ? [...new Set(p.order.filter(valid))] : [];
  return {
    version: 1,
    theme: p.theme === "light" || p.theme === "dark" ? p.theme : "system",
    order: [...order, ...HOME_SECTIONS.filter(s => !order.includes(s))],
    hidden: Array.isArray(p.hidden) ? [...new Set(p.hidden.filter(valid))] : [],
    digest: p.digest === true,
    digestTime: typeof p.digestTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.digestTime) ? p.digestTime : "07:30",
    advisoryNotifications: p.advisoryNotifications === true,
  };
}

export function moveSection(order: HomeSection[], id: HomeSection, direction: -1 | 1) {
  const result = [...order];
  const index = result.indexOf(id), target = index + direction;
  if (index < 0 || target < 0 || target >= result.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
