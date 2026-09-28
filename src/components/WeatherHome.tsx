import { useRef, type ReactNode } from "react";
import { Bell, ChevronRight, CloudSun, Menu, Navigation, RefreshCw, Sunrise, Sunset } from "lucide-react";
import type { WeatherBundle } from "../lib/weather";
import { aqiStatus, feelsLikeTemperatureColor, formatTaipeiTime, reading, uvCategory, windDirectionText } from "../lib/weather";
import type { HomeSection } from "../lib/preferences";
import { usePreferences } from "./PreferencesProvider";
import { WeatherIcon } from "./WeatherIcon";
import { BottomNavigation, type RootView } from "./BottomNavigation";
import { WeatherHero } from "./WeatherHero";

export type SheetName = "menu" | "locations" | "location-search" | "notifications" | "appearance" | "home-order" | "seven-day" | "seventy-two" | "aqi" | "rainfall" | "temperature-ranking";
type Props = {
  data: WeatherBundle | null; loading: boolean; error: string | null;
  onRefresh: () => void; onOpenSheet: (sheet: SheetName, date?: string) => void;
  onNavigate: (view: RootView) => void;
  locations: Array<{ id: string; name: string; kind: string }>;
  selectedLocationId: string; onSelectLocation: (id: string) => void;
};

function SunCard({ data }: { data: WeatherBundle }) {
  const sun = data.forecast.sun;
  const minutes = (v?: string) => { const [h, m] = (v ?? "").split(":").map(Number); return h * 60 + m; };
  const now = minutes(formatTaipeiTime(new Date().toISOString()));
  const rise = minutes(sun?.riseTime), set = minutes(sun?.setTime);
  const progress = Number.isFinite(rise) && set > rise ? Math.min(1, Math.max(0, (now - rise) / (set - rise))) : null;
  const points = Array.from({ length: 61 }, (_, i) => `${20 + i * 5},${94 - Math.sin(i / 60 * Math.PI) * 66}`).join(" ");
  return <div className="sun-card">
    <div className="sun-times"><div><Sunrise size={20} /><span>日出</span><strong>{sun?.riseTime ?? "--:--"}</strong></div><div><Sunset size={20} /><span>日落</span><strong>{sun?.setTime ?? "--:--"}</strong></div></div>
    <svg viewBox="0 0 340 120" role="img" aria-label={`日出 ${sun?.riseTime ?? "無資料"}，日落 ${sun?.setTime ?? "無資料"}`}><line x1="8" y1="88" x2="332" y2="88" stroke="var(--line)" /><polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={points} />{progress !== null && now >= rise && now <= set ? <circle cx={20 + progress * 300} cy={94 - Math.sin(progress * Math.PI) * 66} r="6" fill="#edc451" /> : null}</svg>
  </div>;
}

export function WeatherHome({ data, loading, error, onRefresh, onOpenSheet, onNavigate, locations, selectedLocationId, onSelectLocation }: Props) {
  const { preferences } = usePreferences();
  const touch = useRef<{ x: number; y: number; top: boolean } | null>(null);
  if (loading && !data) return <main className="home-screen" aria-busy="true"><div className="home-loading"><div className="loading-orb" /><strong>正在讀取最新天氣</strong><span>連線中央氣象資料中…</span></div></main>;
  if (!data) return <main className="home-screen error-state"><CloudSun size={64} aria-hidden /><h1>暫時無法載入天氣</h1><p>{error ?? "請稍後再試"}</p><button className="primary-button" onClick={onRefresh} type="button"><RefreshCw size={18} aria-hidden /> 重新整理</button><BottomNavigation active="home" onNavigate={onNavigate} /></main>;
  const { observation, forecast, aqi, hourlyRainfall, heat } = data;
  const today = forecast.daily[0], hourly = forecast.hourly.slice(0, 6), aqiInfo = aqiStatus(aqi.aqi);
  const place = `${forecast.city ?? observation.county} ${forecast.locationName ?? observation.township}`;
  const uv = reading(observation.uvIndex?.value, true) ?? reading(today?.uvIndex, true);
  const feelsLike = reading(heat.feelsLike) ?? reading(forecast.hourly[0]?.feelsLike);
  const temperature = reading(observation.temperature) ?? reading(forecast.hourly[0]?.temperature);
  const humidity = reading(observation.humidity, true);
  const dailyMin = Math.min(...forecast.daily.map(d => d.minTemperature));
  const dailyMax = Math.max(...forecast.daily.map(d => d.maxTemperature));
  const rainReadings = hourlyRainfall.hourlyRainfall.map(h => reading(h.precipitation, true)).filter(v => v !== null);
  const totalRain = rainReadings.length ? Math.round(rainReadings.reduce((a, b) => a + b, 0) * 10) / 10 : null;
  const sections: Record<HomeSection, ReactNode> = {
    aqi: <button type="button" className="aqi-summary" onClick={() => onOpenSheet("aqi")}>
      <div className="aqi-heading"><div><span>空氣品質 AQI</span><strong><i style={{ background: aqiInfo.color }} />{reading(aqi.aqi, true) ?? "--"} <small>{aqiInfo.label}</small></strong></div><div className="aqi-source"><span>資料來源 {aqi.stationName}</span><div className="aqi-bars" aria-hidden>{[50, 100, 150, Infinity].map((v, i, arr) => <i key={v} style={{ background: aqi.aqi >= 0 && aqi.aqi <= v && (i === 0 || aqi.aqi > arr[i - 1]) ? aqiInfo.color : undefined }} />)}</div></div></div>
      <div className="aqi-advice"><strong>{aqiInfo.advice}</strong><span>{aqiInfo.detail}</span></div>
    </button>,
    hourly: <><div className="section-title-row"><h2>逐小時預報</h2><button type="button" onClick={() => onOpenSheet("seventy-two")}>詳細預報 <ChevronRight size={20} /></button></div><button type="button" className="hourly-card" onClick={() => onOpenSheet("seventy-two")} aria-label="查看 72 小時詳細預報">{hourly.map((hour, index) => <div className="hour-item" key={hour.time}><span>{index === 0 ? "現在" : `${Number(formatTaipeiTime(hour.time).slice(0, 2))}時`}</span><WeatherIcon description={hour.weatherDescription} precipitation={hour.precipitationProbability} size={30} /><b>{reading(hour.precipitationProbability, true) ?? "--"}%</b><strong>{reading(hour.temperature) ?? "--"}°</strong></div>)}</button></>,
    daily: <><div className="section-title-row daily-title"><h2>一週天氣</h2><button type="button" onClick={() => onOpenSheet("seven-day")}>7日預報 <ChevronRight size={20} /></button></div><div className="native-week-list">{forecast.daily.map((day, index) => <button type="button" key={day.date} onClick={() => onOpenSheet("seven-day", day.date)} aria-label={`查看 ${day.date} 預報`}><div><strong>{index === 0 ? "今天" : new Intl.DateTimeFormat("zh-TW", { weekday: "long", timeZone: "Asia/Taipei" }).format(new Date(`${day.date}T12:00:00+08:00`))}</strong><small>{Number(day.date.slice(5, 7))}月{Number(day.date.slice(8))}日</small></div><WeatherIcon description={day.weatherDescription} precipitation={day.precipitationProbability} size={29} /><div className="week-temperatures"><div><b>{day.minTemperature}°</b><span className="temperature-range"><i style={{ left: `${(day.minTemperature - dailyMin) / (dailyMax - dailyMin || 1) * 100}%`, right: `${(dailyMax - day.maxTemperature) / (dailyMax - dailyMin || 1) * 100}%` }} /></span><b>{day.maxTemperature}°</b></div><small>紫外線 {day.uvIndex}　體感 {day.minFeelsLike}°/{day.maxFeelsLike}°</small></div></button>)}</div></>,
    observations: <div className="metric-grid observation-metrics"><button type="button" className="metric-card" onClick={() => onOpenSheet("rainfall")}><span>今天累積降雨</span><strong>{totalRain ?? "--"}</strong><small>mm</small></button><div className="metric-card"><span>風速</span><strong>{reading(observation.windSpeed, true) ?? "--"}</strong><small>m/s</small></div><div className="metric-card"><span>氣壓</span><strong>{reading(observation.airPressure, true) ?? "--"}</strong><small>hPa</small></div></div>,
    sun: <SunCard data={data} />,
  };
  return <main className="home-screen" onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, top: window.scrollY <= 0 }; }} onTouchEnd={event => {
    if (!touch.current) return;
    const dx = event.changedTouches[0].clientX - touch.current.x, dy = event.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) { const i = locations.findIndex(l => l.id === selectedLocationId), next = locations[i + (dx < 0 ? 1 : -1)]; if (next) onSelectLocation(next.id); }
    else if (touch.current.top && dy > 100 && Math.abs(dx) < 50 && !loading) onRefresh();
    touch.current = null;
  }}>
    <section className="hero-section"><WeatherHero description={observation.weatherShortDescription ?? today?.weatherDescription ?? ""} observedAt={observation.observedAt} /><div className="hero-controls"><button type="button" className="icon-button" aria-label="開啟更多氣象資訊" onClick={() => onOpenSheet("menu")}><Menu size={27} strokeWidth={2.2} /></button><button type="button" className="icon-button alert-button" aria-label="開啟通知設定" onClick={() => onOpenSheet("notifications")}><Bell size={23} /></button></div><div className="hero-copy"><h1><button type="button" className="location-title-button" onClick={() => onOpenSheet("locations")}>{place} <Navigation size={16} fill="currentColor" aria-hidden /></button></h1><div className="current-temperature">{temperature === null ? "--" : Math.round(temperature)}°</div><p className="high-low">最高 {today?.maxTemperature ?? "--"}° · 最低 {today?.minTemperature ?? "--"}°</p><p className="weather-description">{observation.weatherShortDescription ?? today?.weatherDescription ?? "--"}</p><p className="wind-humidity">{windDirectionText(observation.windDirection)} · 濕度 {humidity ?? "--"}%</p></div></section>
    <section className="content-section"><div className="updated-row"><span>最後更新時間 {formatTaipeiTime(observation.observedAt)}</span><button type="button" onClick={onRefresh} disabled={loading} aria-label="重新整理天氣"><RefreshCw size={16} className={loading ? "spin" : ""} /></button></div>{error ? <div className="inline-notice" role="status">{error}</div> : null}{data.unavailable?.length ? <div className="inline-notice" role="status">{data.unavailable.join("、")}暫時無法取得，其他預報可正常查看。</div> : null}
      <div className="metric-grid"><button type="button" className="metric-card" onClick={() => onOpenSheet("rainfall")}><span>近一小時降雨</span><strong>{reading(forecast.hourly[0]?.precipitationProbability, true) ?? "--"}%</strong></button><button type="button" className="metric-card" onClick={() => onOpenSheet("seven-day")}><span>紫外線</span><strong>{uv ?? "--"} <small>{uvCategory(uv)}</small></strong></button><button type="button" className="metric-card" onClick={() => onOpenSheet("temperature-ranking")}><span>體感溫度</span><strong className="feels-like"><i style={{ background: feelsLikeTemperatureColor(feelsLike) }} />{feelsLike ?? "--"}°</strong></button></div>
      {preferences.order.filter(id => !preferences.hidden.includes(id)).map(id => <section key={id} className={`home-module module-${id}`} data-section={id}>{sections[id]}</section>)}
      <p className="home-source">資料來源：中央氣象署、環境部、各地方政府環保局<br />資料由 Taiwan Weather 提供</p>
    </section>
    {locations.length ? <nav className="location-pager" aria-label="切換已儲存位置">{locations.map(l => <button key={l.id} type="button" aria-label={`切換至${l.name}`} aria-current={l.id === selectedLocationId ? "true" : undefined} onClick={() => onSelectLocation(l.id)}>{l.kind === "current" ? <Navigation size={15} fill="currentColor" /> : <span />}</button>)}</nav> : null}
    <BottomNavigation active="home" onNavigate={onNavigate} />
  </main>;
}
