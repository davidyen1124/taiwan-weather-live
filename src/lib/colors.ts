// Exact values recovered from WeatherUIKit.ColorPalette (light, dark).
type Dyn = readonly [string, string];

export const palette = {
  gray100: ["#FFFFFF", "#111111"], gray200: ["#F7F7F7", "#1C1C1E"], gray300: ["#EDEDED", "#2C2C2E"],
  gray400: ["#C4C4C4", "#3A3A3C"], gray500: ["#969696", "#636366"], gray600: ["#636363", "#8E8E93"],
  gray700: ["#414141", "#AEAEB2"], gray800: ["#292929", "#D1D1D6"], gray900: ["#141414", "#F2F2F7"],
  blue100: ["#E6F6FF", "#001020"], blue200: ["#97DEFF", "#002040"], blue300: ["#6CC4FF", "#004080"],
  blue400: ["#2BA3FF", "#2BA3FF"], blue500: ["#1A7ACC", "#6CC4FF"],
  green200: ["#A1F285", "#345E26"], green300: ["#85E464", "#85E464"],
  yellow400: ["#FFC91D", "#FFC91D"], orange400: ["#FF8D3C", "#FF8D3C"],
  red300: ["#FF7A82", "#7A000F"], red400: ["#EE3344", "#EE3344"],
  purple400: ["#8D40E6", "#BC7AFF"],
} as const satisfies Record<string, Dyn>;

export type Scheme = "light" | "dark";
const pick = (c: Dyn, scheme: Scheme) => (scheme === "dark" ? c[1] : c[0]);

export function aqiLevel(aqi: number | null) {
  if (aqi === null || aqi < 0) return -1;
  if (aqi <= 50) return 0;
  if (aqi <= 100) return 1;
  if (aqi <= 150) return 2;
  return 3;
}

const AQI_COLORS = [palette.green300, palette.yellow400, palette.orange400, palette.red400];
export const aqiColor = (aqi: number | null, scheme: Scheme) =>
  aqiLevel(aqi) < 0 ? pick(palette.gray400, scheme) : pick(AQI_COLORS[aqiLevel(aqi)], scheme);

export function aqiInfo(aqi: number | null) {
  if (aqi === null || aqi < 0) return { status: "--", title: "暫無資料", detail: "測站尚未回報有效的空氣品質資料" };
  if (aqi <= 50) return { status: "良好", title: "適合外出", detail: "適合慢跑、騎車等戶外運動" };
  if (aqi <= 100) return { status: "普通", title: "可正常活動", detail: "可正常戶外活動。敏感族群建議減少激烈戶外活動" };
  if (aqi <= 150) return { status: "對敏感族群不健康", title: "敏感族群注意", detail: "可短暫外出，敏感族群應避免慢跑等激烈運動" };
  if (aqi <= 200) return { status: "對所有族群不健康", title: "避免戶外活動", detail: "應避免外出及戶外運動，若需活動請改在室內進行" };
  if (aqi <= 300) return { status: "非常不健康", title: "避免戶外活動", detail: "空氣危害健康，嚴禁外出或請佩戴口罩" };
  return { status: "危害", title: "避免戶外活動", detail: "空氣危害健康，嚴禁外出或請佩戴口罩" };
}

const UV_COLORS = [palette.green200, palette.yellow400, palette.orange400, palette.red300, palette.red400];
const UV_LABELS = ["低量級", "中量級", "高量級", "過量級", "危險級"];
export function uvLevel(uv: number) {
  if (uv < 3) return 0;
  if (uv < 6) return 1;
  if (uv < 8) return 2;
  if (uv < 11) return 3;
  return 4;
}
export const uvColor = (uv: number, scheme: Scheme) => pick(UV_COLORS[uvLevel(uv)], scheme);
export const uvLabel = (uv: number) => UV_LABELS[uvLevel(uv)];

const TEMPERATURE_STOPS: Array<[number, Dyn]> = [
  [-20, palette.blue100], [-5, palette.blue200], [10, palette.blue300], [25, palette.yellow400],
  [33, palette.orange400], [38, palette.red400], [40, palette.purple400],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** TemperatureColor.color(for:) — linear interpolation between the resolved stop colours. */
export function temperatureColor(value: number, scheme: Scheme) {
  const t = Math.round(value);
  const first = TEMPERATURE_STOPS[0];
  const last = TEMPERATURE_STOPS[TEMPERATURE_STOPS.length - 1];
  if (t <= first[0]) return pick(first[1], scheme);
  if (t >= last[0]) return pick(last[1], scheme);
  const upper = TEMPERATURE_STOPS.findIndex(([stop]) => t <= stop);
  const [t0, c0] = TEMPERATURE_STOPS[upper - 1];
  const [t1, c1] = TEMPERATURE_STOPS[upper];
  const p = (t - t0) / (t1 - t0);
  const a = hex(pick(c0, scheme));
  const b = hex(pick(c1, scheme));
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * p)).join(" ")})`;
}
