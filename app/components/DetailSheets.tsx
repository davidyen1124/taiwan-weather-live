"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  CalendarDays,
  ChevronRight,
  CloudRain,
  Droplets,
  Flame,
  Gauge,
  LineChart,
  Map,
  Mountain,
  Navigation,
  RefreshCw,
  ThermometerSun,
  Wind,
  X,
} from "lucide-react";
import type {
  AQIObservation,
  DailyForecastSegment,
  HeatCard,
  TemperatureImage,
  TemperatureLeaderboard,
  TemperatureRanking,
  WeatherBundle,
} from "../lib/weather";
import {
  aqiStatus,
  fetchAqiByStation,
  fetchAqiStations,
  fetchTemperatureImage,
  fetchTemperatureLeaderboard,
  fetchTemperatureRankings,
  formatDate,
  formatTaipeiTime,
} from "../lib/weather";
import type { SheetName } from "./WeatherHome";
import { WeatherIcon } from "./WeatherIcon";

type Props = {
  active: SheetName | null;
  data: WeatherBundle;
  onClose: () => void;
  onOpenRadar: () => void;
  onNavigate: (sheet: SheetName) => void;
};

type FullSheetProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
};

function FullSheet({ title, children, onClose, className = "" }: FullSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [title]);

  return (
    <div className="sheet-backdrop">
      <section className={`detail-sheet ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="sheet-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label={`關閉${title}`}>
            <X size={27} />
          </button>
        </header>
        <div className="sheet-scroll" ref={scrollRef}>{children}</div>
      </section>
    </div>
  );
}

function DayTabs({
  dates,
  selected,
  onSelect,
}: {
  dates: string[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="day-tabs">
      {dates.map((date, index) => {
        const day = new Intl.DateTimeFormat("zh-TW", {
          weekday: "short",
          timeZone: "Asia/Taipei",
        }).format(new Date(`${date}T12:00:00+08:00`));
        return (
          <button
            type="button"
            key={date}
            className={selected === date ? "active" : ""}
            onClick={() => onSelect(date)}
          >
            <span>{index === 0 ? "今天" : day.replace("週", "")}</span>
            <strong>{Number(date.slice(-2))}</strong>
          </button>
        );
      })}
    </div>
  );
}

function SegmentCard({ segment }: { segment?: DailyForecastSegment }) {
  if (!segment) return null;
  const periodLabel = segment.period === "daytime" ? "白天" : "晚上";
  return (
    <article className="segment-card">
      <div>
        <span>{periodLabel}</span>
        <strong>{segment.minTemperature} - {segment.maxTemperature}°</strong>
        <p>降雨 {segment.precipitationProbability}% · 蒲福風級 {segment.beaufortScale}</p>
        <p>體感 {segment.minFeelsLike} - {segment.maxFeelsLike}°</p>
      </div>
      <div className="segment-weather">
        <WeatherIcon
          description={segment.weatherDescription}
          precipitation={segment.precipitationProbability}
          size={52}
        />
        <span>{segment.weatherDescription}</span>
      </div>
    </article>
  );
}

function SevenDaySheet({ data, onClose }: { data: WeatherBundle; onClose: () => void }) {
  const [selected, setSelected] = useState(data.forecast.daily[0]?.date ?? "");
  const [mode, setMode] = useState<"daily" | "overview">("daily");
  const day = data.forecast.daily.find((item) => item.date === selected) ?? data.forecast.daily[0];
  const segments = data.forecast.dailySegments.filter((item) => item.date === selected);

  return (
    <FullSheet title="7日預報" onClose={onClose}>
      <div className="segmented-control two-column">
        <button type="button" className={mode === "daily" ? "active" : ""} onClick={() => setMode("daily")}>每日預報</button>
        <button type="button" className={mode === "overview" ? "active" : ""} onClick={() => setMode("overview")}>一週概況</button>
      </div>
      <DayTabs dates={data.forecast.daily.map((item) => item.date)} selected={selected} onSelect={setSelected} />

      {mode === "daily" ? (
        <div className="daily-detail">
          <h3>{day ? formatDate(day.date) : "--"}</h3>
          <SegmentCard segment={segments.find((item) => item.period === "daytime")} />
          <SegmentCard segment={segments.find((item) => item.period === "nighttime")} />
          {day ? (
            <div className="mini-metric-grid">
              <div><span>體感最高</span><strong><i className="orange-dot" />{day.maxFeelsLike}°</strong></div>
              <div><span>體感最低</span><strong><i className="blue-dot" />{day.minFeelsLike}°</strong></div>
              <div><span>紫外線</span><strong>{day.uvIndex} <small>{day.uvDescription}</small></strong></div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="week-overview">
          {data.forecast.daily.map((item) => (
            <button type="button" key={item.date} onClick={() => { setSelected(item.date); setMode("daily"); }}>
              <span>{formatDate(item.date)}</span>
              <WeatherIcon description={item.weatherDescription} precipitation={item.precipitationProbability} size={30} />
              <b>{item.precipitationProbability}%</b>
              <strong>{item.minTemperature}° / {item.maxTemperature}°</strong>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      )}
    </FullSheet>
  );
}

function makePoints(values: number[], width = 1000, height = 220, pad = 14) {
  if (!values.length) return "";
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = pad + ((max - value) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function SeventyTwoSheet({ data, onClose }: { data: WeatherBundle; onClose: () => void }) {
  const dates = Array.from(new Set(data.forecast.hourly.map((item) => item.time.slice(0, 10))));
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const [metric, setMetric] = useState<"temperature" | "feels" | "wind" | "humidity">("temperature");
  const visible = data.forecast.hourly.filter((item) => item.time.slice(0, 10) === selectedDate);
  const series = visible.map((item) => {
    if (metric === "feels") return item.feelsLike;
    if (metric === "wind") return Number(item.beaufortScale);
    if (metric === "humidity") return item.humidity;
    return item.temperature;
  });
  const rain = visible.map((item) => item.precipitationProbability);
  const current = visible[0];

  return (
    <FullSheet title="72 小時預報" onClose={onClose} className="chart-sheet">
      <DayTabs dates={dates.slice(0, 5)} selected={selectedDate} onSelect={setSelectedDate} />
      <h3 className="selected-date-title">{selectedDate ? formatDate(selectedDate) : "--"}</h3>
      <div className="segmented-control metric-tabs">
        <button type="button" className={metric === "temperature" ? "active" : ""} onClick={() => setMetric("temperature")}>實際氣溫</button>
        <button type="button" className={metric === "feels" ? "active" : ""} onClick={() => setMetric("feels")}>體感溫度</button>
        <button type="button" className={metric === "wind" ? "active" : ""} onClick={() => setMetric("wind")}>蒲福風級</button>
        <button type="button" className={metric === "humidity" ? "active" : ""} onClick={() => setMetric("humidity")}>濕度</button>
      </div>

      <div className="chart-summary">
        <div>
          <strong>{current ? series[0] : "--"}{metric === "wind" ? " 級" : metric === "humidity" ? "%" : "°"}</strong>
          <span>最高 {series.length ? Math.max(...series) : "--"} · 最低 {series.length ? Math.min(...series) : "--"}</span>
        </div>
        <WeatherIcon description={current?.weatherDescription} precipitation={current?.precipitationProbability} size={50} />
      </div>

      <div className="line-chart" aria-label="逐小時天氣曲線圖">
        <svg viewBox="0 0 1000 250" preserveAspectRatio="none" role="img">
          <defs>
            <linearGradient id="temperature-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9d9d9" stopOpacity=".75" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline className="chart-area-line" points={makePoints(series)} />
          <polygon className="chart-area-fill" points={`0,235 ${makePoints(series)} 1000,235`} />
        </svg>
        <div className="chart-labels">
          {visible.filter((_, index) => index % Math.max(1, Math.floor(visible.length / 4)) === 0).slice(0, 4).map((item) => (
            <span key={item.time}>{formatTaipeiTime(item.time)}</span>
          ))}
        </div>
      </div>

      <div className="rain-title"><strong>降雨機率</strong><b>{rain[0] ?? 0}%</b></div>
      <div className="line-chart rain-chart" aria-label="逐小時降雨機率曲線圖">
        <svg viewBox="0 0 1000 250" preserveAspectRatio="none" role="img">
          <polygon className="rain-fill" points={`0,235 ${makePoints(rain)} 1000,235`} />
          <polyline className="rain-line" points={makePoints(rain)} />
        </svg>
      </div>

      <div className="forecast-facts">
        <div><Wind /><span>風向</span><strong>{current?.windDirection ?? "--"}</strong></div>
        <div><ThermometerSun /><span>舒適度</span><strong>{current?.comfortDescription ?? "--"}</strong></div>
      </div>
    </FullSheet>
  );
}

function pollutantValue(aqi: AQIObservation, key: "o3" | "pm25" | "pm10" | "co" | "so2" | "no2") {
  const item = aqi[key];
  if (typeof item === "number") return item;
  return item?.current ?? "--";
}

function AqiSheet({ data, onClose }: { data: WeatherBundle; onClose: () => void }) {
  const [stations, setStations] = useState<AQIObservation[]>([]);
  const [selected, setSelected] = useState(data.aqi);
  const [stationLoading, setStationLoading] = useState(false);
  const info = aqiStatus(selected.aqi);

  useEffect(() => {
    const controller = new AbortController();
    fetchAqiStations(controller.signal).then(setStations).catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function selectStation(station: AQIObservation) {
    setStationLoading(true);
    try {
      setSelected(await fetchAqiByStation(station.stationId));
    } catch {
      setSelected(station);
    } finally {
      setStationLoading(false);
    }
  }

  const lat = selected.latitude || data.aqi.latitude;
  const lng = selected.longitude || data.aqi.longitude;
  const delta = 0.018;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;

  const pollutantCards = [
    ["臭氧", pollutantValue(selected, "o3"), "O₃", "ppb"],
    ["細懸浮微粒", pollutantValue(selected, "pm25"), "PM2.5", "μg/m³"],
    ["懸浮微粒", pollutantValue(selected, "pm10"), "PM10", "μg/m³"],
    ["一氧化碳", pollutantValue(selected, "co"), "CO", "ppm"],
    ["二氧化硫", pollutantValue(selected, "so2"), "SO₂", "ppb"],
    ["二氧化氮", pollutantValue(selected, "no2"), "NO₂", "ppb"],
  ];

  return (
    <FullSheet title="空氣品質" onClose={onClose}>
      <div className="aqi-detail-score">
        <div><i style={{ background: info.color }} /><strong>{selected.aqi}</strong><span>{info.label}</span></div>
        <p>{info.advice} · {info.detail}</p>
      </div>
      <div className="detail-title-row"><h3>污染物</h3><span>{formatTaipeiTime(selected.publishedAt ?? data.observation.observedAt, true)}</span></div>
      <div className="pollutant-grid">
        {pollutantCards.map(([label, value, symbol, unit]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{value} <small>{symbol}</small></strong>
            <b>{unit}</b>
          </div>
        ))}
      </div>

      <div className="detail-title-row station-heading">
        <h3>測站資訊</h3><span>全台 {stations.length || "--"} 個測站</span>
      </div>
      <div className="station-card">
        <span>測站名稱</span>
        <strong>{selected.stationName}</strong>
        <span>{selected.county}</span>
        <iframe title={`${selected.stationName}地圖`} src={mapUrl} loading="lazy" />
      </div>

      {stations.length ? (
        <div className="station-picker">
          <div className="station-picker-title"><strong>切換測站</strong>{stationLoading ? <RefreshCw className="spin" size={15} /> : null}</div>
          <div>
            {stations.slice(0, 24).map((station) => (
              <button type="button" key={`${station.source ?? "epa"}-${station.stationId}-${station.stationName}`} onClick={() => selectStation(station)}>
                {station.stationName}<span>{station.aqi}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </FullSheet>
  );
}

function MenuSheet({
  onClose,
  onNavigate,
  onOpenRadar,
}: {
  onClose: () => void;
  onNavigate: (sheet: SheetName) => void;
  onOpenRadar: () => void;
}) {
  const items = [
    { icon: CalendarDays, title: "7 日預報", detail: "每日與一週概況", action: () => onNavigate("seven-day") },
    { icon: LineChart, title: "72 小時預報", detail: "溫度、降雨與濕度曲線", action: () => onNavigate("seventy-two") },
    { icon: Gauge, title: "空氣品質", detail: "污染物與全台測站", action: () => onNavigate("aqi") },
    { icon: Map, title: "即時圖資", detail: "雷達、降雨雷達與溫度分布", action: onOpenRadar },
    { icon: Mountain, title: "更多觀測", detail: "雨量、熱感與高溫排行", action: () => onNavigate("insights") },
  ];
  return (
    <FullSheet title="天氣功能" onClose={onClose} className="menu-sheet">
      <div className="menu-list">
        {items.map((item) => (
          <button type="button" key={item.title} onClick={item.action}>
            <span><item.icon size={23} /></span>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <ChevronRight size={20} />
          </button>
        ))}
      </div>
      <p className="source-note">資料即時取自 Taiwan Weather API，所有網路傳輸皆使用 HTTPS。</p>
    </FullSheet>
  );
}

function InsightsSheet({ data, onClose, onOpenRadar }: { data: WeatherBundle; onClose: () => void; onOpenRadar: () => void }) {
  const [image, setImage] = useState<TemperatureImage | null>(null);
  const [rankings, setRankings] = useState<TemperatureRanking[]>([]);
  const [leaderboard, setLeaderboard] = useState<TemperatureLeaderboard | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchTemperatureImage(controller.signal),
      fetchTemperatureRankings(controller.signal),
      fetchTemperatureLeaderboard(controller.signal),
    ]).then(([nextImage, nextRankings, nextLeaderboard]) => {
      setImage(nextImage);
      setRankings(nextRankings);
      setLeaderboard(nextLeaderboard);
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const hourlyValues = data.hourlyRainfall.hourlyRainfall.map((item) => item.precipitation);
  const dailyValues = data.dailyRainfall.dailyRainfall.map((item) => item.precipitation ?? 0);
  const maxHourly = hourlyValues.length ? Math.max(...hourlyValues) : 0;
  const maxDaily = dailyValues.length ? Math.max(...dailyValues) : 0;
  const heat = leaderboard?.data.find((item) => item.locationId === data.forecast.locationId) ?? data.heat;

  return (
    <FullSheet title="觀測與排行" onClose={onClose} className="insights-sheet">
      <section className="insight-section">
        <div className="insight-heading"><div><Droplets /><h3>今日逐時雨量</h3></div><strong>{data.hourlyRainfall.station.stationName}</strong></div>
        <div className="bar-chart">
          {hourlyValues.map((value, index) => (
            <i key={index} style={{ height: `${Math.max(4, maxHourly ? (value / maxHourly) * 100 : 4)}%` }} title={`${index}時 ${value} mm`} />
          ))}
        </div>
        <div className="chart-meta"><span>0 時</span><span>現在</span></div>
      </section>

      <section className="insight-section">
        <div className="insight-heading"><div><ArrowDown /><h3>近 30 日雨量</h3></div><strong>最高 {maxDaily} mm</strong></div>
        <div className="bar-chart daily-bars">
          {dailyValues.map((value, index) => (
            <i key={index} style={{ height: `${Math.max(3, maxDaily ? (value / maxDaily) * 100 : 3)}%` }} title={`${value} mm`} />
          ))}
        </div>
        <div className="chart-meta"><span>{data.dailyRainfall.dateRange.start.slice(5).replace("-", "/")}</span><span>{data.dailyRainfall.dateRange.end.slice(5).replace("-", "/")}</span></div>
      </section>

      <section className="heat-card-detail">
        <div><Flame /><span>目前體感</span><strong>{heat.feelsLike}°</strong></div>
        <div className="heat-copy">
          <span>{heat.rankText} · 擊敗 {heat.overtakesPercent}% 地區</span>
          <strong>{heat.subtitle ?? heat.beatText}</strong>
          <p>{heat.displayLocationName} · 實際溫度 {heat.temperature}°</p>
        </div>
      </section>

      {image ? (
        <section className="temperature-map-card">
          <div className="insight-heading"><div><ThermometerSun /><h3>全台溫度分布</h3></div><strong>{formatTaipeiTime(image.dateTime)}</strong></div>
          <button type="button" onClick={onOpenRadar}>
            <img src={image.r2Url ?? image.url ?? ""} alt="全台即時溫度分布圖" />
            <span>在圖資中查看 <ChevronRight size={18} /></span>
          </button>
        </section>
      ) : null}

      <section className="ranking-section">
        <div className="insight-heading"><div><Flame /><h3>全台高溫排行</h3></div><strong>前 100 站</strong></div>
        <div className="ranking-list">
          {rankings.slice(0, 10).map((item) => (
            <div key={item.stationId}>
              <b>#{item.rank}</b>
              <div><strong>{item.stationName}</strong><span>{item.address}</span></div>
              <em>{item.temperatureC}°</em>
            </div>
          ))}
        </div>
      </section>
    </FullSheet>
  );
}

export function DetailSheets({ active, data, onClose, onOpenRadar, onNavigate }: Props) {
  const content = useMemo(() => {
    if (active === "seven-day") return <SevenDaySheet data={data} onClose={onClose} />;
    if (active === "seventy-two") return <SeventyTwoSheet data={data} onClose={onClose} />;
    if (active === "aqi") return <AqiSheet data={data} onClose={onClose} />;
    if (active === "insights") return <InsightsSheet data={data} onClose={onClose} onOpenRadar={onOpenRadar} />;
    if (active === "menu") return <MenuSheet onClose={onClose} onNavigate={onNavigate} onOpenRadar={onOpenRadar} />;
    return null;
  }, [active, data, onClose, onOpenRadar, onNavigate]);
  return content;
}
