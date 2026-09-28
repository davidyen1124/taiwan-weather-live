import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyForecast, HourlyForecast, WeatherBundle } from "../lib/api";
import { isNightHour, periodIcon } from "../lib/assets";
import { palette, uvColor, uvLabel, type Scheme } from "../lib/colors";
import { dateKey, fromDateKey, fullDate, taipei, WEEKDAY_SHORT } from "../lib/format";
import { useStore } from "../state";
import { niceTicks, smoothPath } from "./charts";
import { Segmented, Sheet, SheetHeader } from "./ui";

const dyn = (c: readonly [string, string], scheme: Scheme) => (scheme === "dark" ? c[1] : c[0]);

function humidityOf(description: string) {
  const match = description.match(/相對濕度\s*(\d+)%/);
  return match ? Number(match[1]) : null;
}

function DayStrip({ days, selected, onSelect }: { days: string[]; selected: string; onSelect: (day: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(".day-chip.selected");
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);
  return (
    <div className="day-strip" ref={ref}>
      {days.map((day) => {
        const p = taipei(fromDateKey(day));
        return (
          <button type="button" key={day} className={`day-chip ${day === selected ? "selected" : ""}`} onClick={() => onSelect(day)}>
            <span className="day-chip-weekday">{WEEKDAY_SHORT[p.weekday]}</span>
            <span className="day-chip-date">{p.day}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatTile({ label, color, value, suffix }: { label: string; color?: string; value: string; suffix?: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{color ? <span className="dot" style={{ background: color }} /> : null}{value}{suffix ? <small>{suffix}</small> : null}</span>
    </div>
  );
}

export function WeekSheet({ open, onClose, data, initialDate }: { open: boolean; onClose: () => void; data: WeatherBundle | undefined; initialDate?: string }) {
  const { scheme } = useStore();
  const [mode, setMode] = useState<"daily" | "overview">("daily");
  const days = useMemo(() => data?.forecast.daily.slice(0, 7) ?? [], [data]);
  const [selected, setSelected] = useState<string>(initialDate ?? days[0]?.date ?? "");
  useEffect(() => { if (open) { setSelected(initialDate ?? days[0]?.date ?? ""); setMode("daily"); } }, [open, initialDate, days]);
  const day = days.find((d) => d.date === selected) ?? days[0];

  return (
    <Sheet open={open} onClose={onClose} label="7日預報" className="forecast-sheet">
      <SheetHeader title="7日預報" onClose={onClose} />
      <Segmented className="sheet-segmented" items={[{ value: "daily", label: "每日預報" }, { value: "overview", label: "一週概況" }]} value={mode} onChange={setMode} />
      {day ? (
        <div className="sheet-body">
          {mode === "daily" ? (
            <>
              <DayStrip days={days.map((d) => d.date)} selected={day.date} onSelect={setSelected} />
              <DailyDetail data={data!} day={day} />
              <div className="stat-grid">
                <StatTile label="體感最高" color={dyn(palette.orange400, scheme)} value={`${Math.round(day.maxFeelsLike)}°`} />
                <StatTile label="體感最低" color={dyn(palette.blue300, scheme)} value={`${Math.round(day.minFeelsLike)}°`} />
                {day.uvIndex != null ? <StatTile label="紫外線" color={uvColor(day.uvIndex, scheme)} value={String(day.uvIndex)} suffix={uvLabel(day.uvIndex)} /> : null}
              </div>
            </>
          ) : (
            <>
              <WeekChart days={days} selected={day.date} onSelect={setSelected} scheme={scheme} />
              <div className="stat-grid overview">
                <StatTile label="體感最高" color={dyn(palette.orange400, scheme)} value={`${Math.round(day.maxFeelsLike)}°`} />
                <StatTile label="體感最低" color={dyn(palette.blue300, scheme)} value={`${Math.round(day.minFeelsLike)}°`} />
                <StatTile label="紫外線" color={day.uvIndex != null ? uvColor(day.uvIndex, scheme) : undefined} value={day.uvIndex != null ? String(day.uvIndex) : "--"} suffix={day.uvIndex != null ? uvLabel(day.uvIndex) : undefined} />
                <StatTile label="濕度" color={dyn(palette.blue300, scheme)} value={humidityOf(day.description) != null ? `${humidityOf(day.description)}%` : "--"} />
              </div>
            </>
          )}
        </div>
      ) : null}
    </Sheet>
  );
}

function DailyDetail({ data, day }: { data: WeatherBundle; day: DailyForecast }) {
  const segments = data.forecast.dailySegments.filter((s) => s.date === day.date);
  const rows = segments.length ? segments : [{ ...day, period: "daytime" as const }];
  return (
    <div className="daily-detail">
      {rows.map((segment) => {
        const humidity = humidityOf(segment.description);
        return (
          <div className="period-row" key={segment.period}>
            <div>
              <p className="period-name">{segment.period === "nighttime" ? "晚上" : "白天"}</p>
              <p className="period-range">{Math.round(segment.minTemperature)} - {Math.round(segment.maxTemperature)}°</p>
              <p className="period-meta">降雨 {segment.precipitationProbability == null ? "--" : `${segment.precipitationProbability}%`} • 濕度 {humidity == null ? "--" : `${humidity}%`}</p>
              <p className="period-meta">蒲福風級 {segment.beaufortScale || "--"}</p>
            </div>
            <div className="period-weather">
              <img src={periodIcon(segment.weatherCode, segment.period === "nighttime", segment.weatherDescription)} alt="" />
              <span>{segment.weatherDescription}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekChart({ days, selected, onSelect, scheme }: { days: DailyForecast[]; selected: string; onSelect: (d: string) => void; scheme: Scheme }) {
  const W = 361, H = 214, plotL = 20, plotR = 322, top = 40, bottom = 186;
  const ticks = niceTicks(Math.min(...days.map((d) => d.minTemperature)), Math.max(...days.map((d) => d.maxTemperature)), 3);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const x = (i: number) => plotL + (i * (plotR - plotL)) / Math.max(1, days.length - 1);
  const y = (t: number) => bottom - ((t - lo) / (hi - lo)) * (bottom - top);
  const maxPts = days.map((d, i) => [x(i), y(d.maxTemperature)] as [number, number]);
  const minPts = days.map((d, i) => [x(i), y(d.minTemperature)] as [number, number]);
  const index = Math.max(0, days.findIndex((d) => d.date === selected));
  const orange = dyn(palette.orange400, scheme), blue = dyn(palette.blue400, scheme);
  const fill = `${smoothPath(maxPts)} L${smoothPath([...minPts].reverse()).slice(1)} Z`;
  const svgRef = useRef<SVGSVGElement>(null);

  const pick = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const local = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((local - plotL) / (plotR - plotL)) * (days.length - 1));
    onSelect(days[Math.max(0, Math.min(days.length - 1, i))].date);
  };

  return (
    <div className="week-chart">
      <div className="week-chart-head">
        <strong>本週氣溫</strong>
        <span className="legend"><i style={{ background: orange }} />最高溫<i style={{ background: blue }} />最低溫</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H + 44}`} className="week-chart-svg"
        onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); pick(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons) pick(e.clientX); }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={plotR + 4} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={W} y={y(t) + 5} textAnchor="end" className="axis-label">{t}°</text>
          </g>
        ))}
        <path d={fill} fill={dyn(palette.orange400, scheme)} fillOpacity={scheme === "dark" ? 0.12 : 0.08} />
        <path d={smoothPath(maxPts)} stroke={orange} strokeWidth={2.6} fill="none" />
        <path d={smoothPath(minPts)} stroke={blue} strokeWidth={2.6} fill="none" />
        {[[maxPts[index], orange, days[index].maxTemperature], [minPts[index], blue, days[index].minTemperature]].map(([p, color, value], k) => {
          const [px, py] = p as [number, number];
          return (
            <g key={k}>
              <circle cx={px} cy={py} r={11} fill={color as string} fillOpacity={0.22} />
              <circle cx={px} cy={py} r={5.5} fill={color as string} />
              <text x={Math.max(px, 18)} y={py - 17} textAnchor="middle" className="point-label" fill={color as string}>{Math.round(value as number)}°</text>
            </g>
          );
        })}
        {days.map((d, i) => {
          const p = taipei(fromDateKey(d.date));
          return (
            <text key={d.date} x={Math.max(x(i), 12)} y={H + 12} textAnchor="middle" className={`x-label ${i === index ? "selected" : ""}`}>
              {i === 0 ? <tspan x={Math.max(x(i), 16)}>今天</tspan> : <><tspan x={x(i)}>{p.month}/{p.day}</tspan><tspan x={x(i)} dy={18}>({WEEKDAY_SHORT[p.weekday]})</tspan></>}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

type Metric = "temperature" | "feelsLike" | "wind" | "humidity";

export function HourlySheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: WeatherBundle | undefined }) {
  const { scheme } = useStore();
  const hours = data?.forecast.hourly ?? [];
  const days = useMemo(() => [...new Set(hours.map((h) => dateKey(h.time)))], [hours]);
  const [day, setDay] = useState(days[0] ?? "");
  const [metric, setMetric] = useState<Metric>("temperature");
  useEffect(() => { if (open) { setDay(days[0] ?? ""); setMetric("temperature"); } }, [open, days]);

  const window = useMemo(() => {
    if (!hours.length) return [] as HourlyForecast[];
    if (day === days[0]) return hours.slice(0, 25);
    return hours.filter((h) => dateKey(h.time) === day);
  }, [hours, day, days]);

  const first = window[0];
  const values = window.map((h) => valueOf(h, metric));
  const temps = window.map((h) => (metric === "feelsLike" ? h.feelsLike : h.temperature));

  return (
    <Sheet open={open} onClose={onClose} label="72 小時預報" className="forecast-sheet hourly-sheet">
      <SheetHeader title="72 小時預報" onClose={onClose} />
      {first ? (
        <div className="sheet-body">
          <DayStrip days={days} selected={day} onSelect={setDay} />
          <p className="full-date">{fullDate(day)}</p>
          <div className="hairline" />
          <Segmented variant="gray" className="metric-segmented" value={metric} onChange={setMetric}
            items={[{ value: "temperature", label: "實際氣溫" }, { value: "feelsLike", label: "體感溫度" }, { value: "wind", label: "蒲福風級" }, { value: "humidity", label: "濕度" }]} />
          {metric === "temperature" || metric === "feelsLike" ? (
            <div className="metric-head">
              <div className="metric-big">
                <strong>{Math.round(values[0])}°</strong>
                <img src={periodIcon(first.weatherCode, isNightHour(taipei(first.time).hour), first.weatherDescription)} alt={first.weatherDescription} />
              </div>
              <p className="metric-range">最高 {Math.round(Math.max(...temps))}°&nbsp;&nbsp;最低 {Math.round(Math.min(...temps))}°</p>
            </div>
          ) : (
            <div className="metric-head compact">
              <p className="metric-time">{String(taipei(first.time).hour).padStart(2, "0")}:00</p>
              <strong>{metric === "wind" ? `${first.beaufortScale} 級` : `${first.humidity}%`}</strong>
            </div>
          )}
          <LineChart hours={window} values={values} metric={metric} scheme={scheme} startsNow={day === days[0]} />
          <div className="rain-head">
            <strong>降雨機率</strong>
            <span>{first.precipitationProbability == null ? "--" : `${first.precipitationProbability}%`}</span>
          </div>
          <LineChart hours={window} values={window.map((h) => h.precipitationProbability ?? 0)} metric="rain" scheme={scheme} startsNow={day === days[0]} />
          <div className="hourly-facts">
            <div><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9h11a2.5 2.5 0 10-2.5-2.5M3 13h15a2.5 2.5 0 11-2.5 2.5M3 17h8" /></svg><span><small>風向</small><strong>{first.windDirection}</strong></span></div>
            <div><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.2a4.3 4.3 0 017.5 2.6C19.5 15.4 12 20 12 20z" /></svg><span><small>舒適度</small><strong>{first.comfortDescription}</strong></span></div>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

function valueOf(h: HourlyForecast, metric: Metric) {
  switch (metric) {
    case "temperature": return h.temperature;
    case "feelsLike": return h.feelsLike;
    case "wind": return Number.parseInt(h.beaufortScale, 10) || 0;
    case "humidity": return h.humidity;
  }
}

function LineChart({ hours, values, metric, scheme, startsNow }: { hours: HourlyForecast[]; values: number[]; metric: Metric | "rain"; scheme: Scheme; startsNow: boolean }) {
  const W = 361, plotL = 0, plotR = 314, top = 8, bottom = metric === "rain" ? 181 : 142;
  let ticks: number[];
  if (metric === "rain" || metric === "humidity") ticks = [0, 20, 40, 60, 80, 100];
  else if (metric === "wind") ticks = [0, 3, 6, 9, 12];
  else {
    const lo = Math.floor((Math.min(...values) - 1) / 3) * 3;
    const hi = Math.ceil((Math.max(...values) + 1) / 3) * 3;
    ticks = [];
    for (let t = lo; t <= hi; t += 3) ticks.push(t);
  }
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const n = 24;
  const x = (i: number) => plotL + (i * (plotR - plotL)) / n;
  const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1][0]},${bottom} L${pts[0][0]},${bottom} Z`;
  const rain = metric === "rain";
  const stroke = rain ? dyn(palette.blue400, scheme) : "var(--label)";
  const id = `grad-${metric}`;
  const startHour = taipei(hours[0].time).hour;
  const labels = hours.map((h, i) => ({ i, p: taipei(h.time) })).filter(({ i, p }) => i === 0 || (i % 6 === 0) || (p.hour === 0 && startsNow));

  return (
    <svg viewBox={`0 0 ${W} ${bottom + 34}`} className={`line-chart ${rain ? "rain" : ""}`}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={rain ? stroke : "var(--label)"} stopOpacity={rain ? 0 : scheme === "dark" ? 0.28 : 0.2} />
          <stop offset="1" stopColor={rain ? stroke : "var(--label)"} stopOpacity={0} />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={0} x2={plotR} y1={y(t)} y2={y(t)} className="grid-line" />
          <text x={W} y={y(t) + 5} textAnchor="end" className="axis-label">{t}{metric === "rain" || metric === "humidity" ? "%" : metric === "wind" ? "" : "°"}</text>
        </g>
      ))}
      {labels.filter(({ i }) => i > 0).map(({ i }) => <line key={i} x1={x(i)} x2={x(i)} y1={top} y2={bottom} className="grid-dash" />)}
      <line x1={x(0)} x2={x(0)} y1={top} y2={bottom} className="grid-dash" />
      {!rain ? <path d={area} fill={`url(#${id})`} /> : null}
      <path d={line} stroke={stroke} strokeWidth={rain ? 2.6 : 3} fill="none" strokeLinecap="round" />
      <circle cx={pts[0][0]} cy={pts[0][1]} r={12} fill="var(--gray500)" fillOpacity={0.35} className={rain ? "hidden" : ""} />
      <circle cx={pts[0][0]} cy={pts[0][1]} r={rain ? 4.5 : 7} fill={stroke} />
      {labels.map(({ i, p }) => (
        <text key={i} x={x(i)} y={bottom + 26} className="x-axis" textAnchor="start">
          {p.hour === 0 && i > 0 ? `${p.month}/${p.day} (${WEEKDAY_SHORT[p.weekday]})` : `${i === 0 && !startsNow ? 0 : p.hour}時`}
        </text>
      ))}
      <title>{startHour}</title>
    </svg>
  );
}
