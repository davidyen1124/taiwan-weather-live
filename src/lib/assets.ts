const icons = import.meta.glob("../assets/icons/*.png", { eager: true, import: "default", query: "?url" }) as Record<string, string>;

export const iconUrl = (name: string) => icons[`../assets/icons/${name}.png`];

export const isNightHour = (hour: number) => hour < 6 || hour >= 18;

export type WeatherKind = "clear" | "partly-clear" | "partly-cloudy" | "cloudy" | "rainy" | "thunder";

/**
 * CWA Wx description/code → the app's weather families (clear, partly clear, cloudy, overcast, rain),
 * plus thunderstorms, which CWA reports often (雷陣雨) but the app folds into rain.
 */
export function weatherKind(code: number, description = ""): WeatherKind {
  const d = description;
  if (/雷/.test(d) || (code >= 15 && code <= 18) || code === 21 || code === 22 || (code >= 33 && code <= 36) || code === 41) return "thunder";
  if (/雨|雪/.test(d) || (code >= 8 && code <= 23) || (code >= 29 && code <= 42)) return "rainy";
  if (d) {
    if (/^晴(天|有霧)?$/.test(d)) return "clear";
    if (/晴/.test(d)) return "partly-clear";
    if (/^陰/.test(d)) return "cloudy";
    return "partly-cloudy";
  }
  if (code === 1 || code === 24) return "clear";
  if (code === 2 || code === 3 || code === 25 || code === 26) return "partly-clear";
  if (code === 6 || code === 7 || code === 28) return "cloudy";
  return "partly-cloudy";
}

const hero = import.meta.glob("../assets/hero/*.webp", { eager: true, import: "default", query: "?url" }) as Record<string, string>;
const period = import.meta.glob("../assets/period/*.webp", { eager: true, import: "default", query: "?url" }) as Record<string, string>;

/** Generated hero artwork (arch window + weather scene). */
export const heroArt = (kind: WeatherKind, night: boolean) => hero[`../assets/hero/${kind}-${night ? "night" : "day"}.webp`];

/** Colourful period icon (7-day list, life cards, detail sheets). Overcast shares the cloud icon. */
export function periodIcon(code: number, night: boolean, description = "") {
  const kind = weatherKind(code, description);
  const family = kind === "cloudy" ? "partly-cloudy" : kind;
  return period[`../assets/period/${family}-${night ? "night" : "day"}.webp`];
}

/** Small monochrome line glyphs used by the hourly strip (the app's own template icons). */
export function glyphIcon(code: number, night: boolean, description = "") {
  switch (weatherKind(code, description)) {
    case "clear": return night ? "icon_sun_night" : "icon_sun_day";
    case "partly-clear": return night ? "icon_cloud_sun_night" : "icon_cloud_sun_day";
    case "rainy":
    case "thunder": return /雪/.test(description) ? "icon_snow" : "icon_rainy";
    default: return "icon_cloudy";
  }
}

const SUGGESTION_ICONS: Array<[RegExp, string]> = [
  [/laundry_(no|bad)|不適合曬衣/, "icon_laundry_no"],
  [/laundry|曬衣/, "icon_laundry_ok"],
  [/long_sleeve|長袖/, "icon_long_sleeve"],
  [/jacket|coat|外套/, "icon_jacket"],
  [/short_sleeve|t_?shirt|短袖/, "icon_tshirt"],
  [/umbrella_big|big_umbrella|雨傘|大傘/, "icon_umbrella_big"],
  [/umbrella|傘/, "icon_umbrella_small"],
  [/snow|雪/, "icon_snow"],
];
export function suggestionIcon(id: string, text: string) {
  const key = `${id} ${text}`;
  return SUGGESTION_ICONS.find(([re]) => re.test(key))?.[1] ?? "icon_tshirt";
}
