const art = import.meta.glob("../assets/art/*.webp", { eager: true, import: "default", query: "?url" }) as Record<string, string>;
const icons = import.meta.glob("../assets/icons/*.png", { eager: true, import: "default", query: "?url" }) as Record<string, string>;

export const artUrl = (name: string) => art[`../assets/art/${name}.webp`];
export const iconUrl = (name: string) => icons[`../assets/icons/${name}.png`];

export const isNightHour = (hour: number) => hour < 6 || hour >= 18;

type Kind = "clear" | "partly_clear" | "partly_cloudy" | "rainy" | "snow";

/** CWA Wx code → the app's weather families. */
export function weatherKind(code: number, description = ""): Kind {
  if (code === 23 || code === 42 || /雪/.test(description)) return "snow";
  if ((code >= 8 && code <= 22) || code >= 29 || /雨|雷/.test(description)) return "rainy";
  if (code === 1) return "clear";
  if (code === 2 || code === 3) return "partly_clear";
  return "partly_cloudy";
}

/** Colourful 3D period art (icon_period_*). */
export function periodIcon(code: number, night: boolean, description = "") {
  const kind = weatherKind(code, description);
  const family = kind === "snow" ? "rainy" : kind;
  return artUrl(`icon_period_${family}_${night ? "night" : "day"}`);
}

/** Small line glyphs used by the hourly strip. */
export function glyphIcon(code: number, night: boolean, description = "") {
  switch (weatherKind(code, description)) {
    case "clear": return night ? "icon_sun_night" : "icon_sun_day";
    case "partly_clear": return night ? "icon_cloud_sun_night" : "icon_cloud_sun_day";
    case "rainy": return "icon_rainy";
    case "snow": return "icon_snow";
    default: return "icon_cloudy";
  }
}

/** Hero Lottie animation file (driven by the current forecast period). */
export function heroAnimation(code: number, night: boolean, description = "") {
  const kind = weatherKind(code, description);
  if (kind === "rainy" || kind === "snow") return "lottie-top-rainy";
  if (kind === "clear") return night ? "lottie-top-moon" : "lottie-top-sun";
  if (night) return "lottie-top-cloudy";
  if (kind === "partly_clear") return "lottie-top-partly-clear";
  return code === 7 ? "lottie-top-cloudy" : "lottie-top-partly-cloudy";
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
