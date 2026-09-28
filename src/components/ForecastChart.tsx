
import { reading } from "../lib/weather";

type Props = { values: number[]; times: string[]; selected: number; onSelect: (index: number) => void; rain?: boolean; unit: string; label: string; fixedMax?: number };
export function ForecastChart({ values, times, selected, onSelect, rain = false, unit, label, fixedMax }: Props) {
  const clean = values.map(v => reading(v, rain || fixedMax !== undefined));
  const available = clean.filter(v => v !== null);
  const low = rain || fixedMax !== undefined ? 0 : Math.floor((Math.min(...available) - 2) / 3) * 3;
  const high = rain ? 100 : fixedMax ?? Math.ceil((Math.max(...available) + 2) / 3) * 3;
  const min = Number.isFinite(low) ? low : 0, max = Number.isFinite(high) ? Math.max(high, min + 1) : 100;
  const x = (i: number) => 4 + i / Math.max(1, values.length - 1) * 344;
  const y = (v: number) => 12 + (max - v) / (max - min) * 176;
  const path = clean.map((v, i) => v === null ? "" : `${i === 0 || clean[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const validSelected = clean[selected];
  const selectedX = x(selected), selectedY = validSelected === null || validSelected === undefined ? null : y(validSelected);
  return <div className={`interactive-forecast-chart ${rain ? "is-rain" : ""}`}>
    <svg viewBox="0 0 390 220" preserveAspectRatio="none" role="img" aria-label={label}>
      {[0, 1, 2, 3, 4, 5].map(i => { const v = max - (max - min) * i / 5; return <g key={i}><line x1="4" x2="348" y1={12 + i * 35.2} y2={12 + i * 35.2} className="grid-line" /><text x="357" y={16 + i * 35.2}>{Math.round(v)}{unit}</text></g>; })}
      {rain && clean.every(v => v !== null) && available.length ? <path d={`${path} L348,188 L4,188 Z`} className="forecast-area" /> : null}
      <path d={path} className="forecast-line" />
      {selectedY !== null ? <g><line className="chart-crosshair" x1={selectedX} x2={selectedX} y1="12" y2="188" /><circle className="chart-point-halo" cx={selectedX} cy={selectedY} r="11" /><circle className="chart-point" cx={selectedX} cy={selectedY} r="4" /></g> : null}
      {times.map((time, i) => i % Math.max(1, Math.floor(times.length / 4)) === 0 ? <text key={time} x={x(i)} y="211" textAnchor={i === 0 ? "start" : "middle"}>{time}</text> : null)}
    </svg>
    <input type="range" className="chart-selector" aria-label={rain ? "選擇降雨預報時間" : "選擇天氣預報時間"} aria-valuetext={`${times[selected]}，${validSelected ?? "無資料"}${unit}`} min={0} max={Math.max(0, values.length - 1)} value={selected} onChange={event => onSelect(Number(event.target.value))} />
  </div>;
}
