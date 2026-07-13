import {
  ChevronRight,
  CloudSun,
  Droplets,
  Gauge,
  House,
  LocateFixed,
  Map,
  Menu,
  Navigation,
  RefreshCw,
  Sparkles,
  ThermometerSun,
} from "lucide-react";
import type { WeatherBundle } from "../lib/weather";
import {
  aqiStatus,
  formatTaipeiTime,
  windDirectionText,
} from "../lib/weather";
import { WeatherIcon } from "./WeatherIcon";

export type SheetName = "menu" | "seven-day" | "seventy-two" | "aqi" | "insights";

type Props = {
  data: WeatherBundle | null;
  loading: boolean;
  error: string | null;
  locating: boolean;
  onLocate: () => void;
  onRefresh: () => void;
  onOpenSheet: (sheet: SheetName) => void;
  onOpenRadar: () => void;
};

function LoadingHome() {
  return (
    <main className="home-screen" aria-busy="true">
      <div className="home-loading">
        <div className="loading-orb" />
        <strong>正在讀取最新天氣</strong>
        <span>連線中央氣象資料中…</span>
      </div>
    </main>
  );
}

export function WeatherHome({
  data,
  loading,
  error,
  locating,
  onLocate,
  onRefresh,
  onOpenSheet,
  onOpenRadar,
}: Props) {
  if (loading && !data) return <LoadingHome />;
  if (!data) {
    return (
      <main className="home-screen error-state">
        <CloudSun size={64} aria-hidden />
        <h1>暫時無法載入天氣</h1>
        <p>{error ?? "請稍後再試"}</p>
        <button className="primary-button" onClick={onRefresh} type="button">
          <RefreshCw size={18} aria-hidden /> 重新整理
        </button>
      </main>
    );
  }

  const { observation, forecast, aqi, hourlyRainfall, dailyRainfall, heat } = data;
  const today = forecast.daily[0];
  const hourly = forecast.hourly.slice(0, 6);
  const aqiInfo = aqiStatus(aqi.aqi);
  const place = `${forecast.city ?? observation.county} ${forecast.locationName ?? observation.township}`;
  const latestRain = hourlyRainfall.hourlyRainfall.at(-1)?.precipitation ?? observation.precipitation?.now ?? 0;

  return (
    <main className="home-screen">
      <section className="hero-section">
        <img className="hero-art" src="/weather-hero.png" alt="" />
        <div className="hero-controls">
          <button
            type="button"
            className="icon-button"
            aria-label="開啟更多氣象資訊"
            onClick={() => onOpenSheet("menu")}
          >
            <Menu size={27} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="icon-button locate-button"
            aria-label="使用目前位置"
            onClick={onLocate}
            disabled={locating}
          >
            <LocateFixed size={23} className={locating ? "spin" : ""} />
          </button>
        </div>

        <div className="hero-copy">
          <h1>
            {place} <Navigation size={19} fill="currentColor" aria-hidden />
          </h1>
          <div className="current-temperature">{Math.round(observation.temperature)}°</div>
          <p className="high-low">
            最高 {today?.maxTemperature ?? "--"}° · 最低 {today?.minTemperature ?? "--"}°
          </p>
          <p className="weather-description">
            {today?.weatherDescription ?? observation.weatherShortDescription ?? "天氣穩定"}
          </p>
          <p className="wind-humidity">
            {windDirectionText(observation.windDirection)} · 濕度 {Math.round(observation.humidity)}%
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="updated-row">
          <span>最後更新時間 {formatTaipeiTime(observation.observedAt)}</span>
          <button type="button" onClick={onRefresh} aria-label="重新整理天氣">
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>

        {error ? <div className="inline-notice">目前顯示上次成功取得的資料</div> : null}

        <div className="metric-grid">
          <button type="button" className="metric-card" onClick={() => onOpenSheet("insights")}>
            <span>近一小時降雨</span>
            <strong>{latestRain > 0 ? `${latestRain} mm` : `${today?.precipitationProbability ?? 0}%`}</strong>
          </button>
          <button type="button" className="metric-card" onClick={() => onOpenSheet("insights")}>
            <span>紫外線</span>
            <strong>{today?.uvIndex ?? observation.uvIndex?.value ?? 0} <small>{today?.uvDescription ?? "低量級"}</small></strong>
          </button>
          <button type="button" className="metric-card" onClick={() => onOpenSheet("insights")}>
            <span>體感溫度</span>
            <strong className="feels-like"><i />{heat.feelsLike ?? forecast.hourly[0]?.feelsLike ?? "--"}°</strong>
          </button>
        </div>

        <button
          type="button"
          className="aqi-summary"
          onClick={() => onOpenSheet("aqi")}
        >
          <div className="aqi-heading">
            <div>
              <span>空氣品質 AQI</span>
              <strong><i style={{ background: aqiInfo.color }} />{aqi.aqi} <small>{aqiInfo.label}</small></strong>
            </div>
            <div className="aqi-source">
              <span>資料來源 {aqi.stationName}</span>
              <div className="aqi-bars" aria-hidden>
                <i style={{ background: aqiInfo.color }} />
                <i /><i /><i />
              </div>
            </div>
          </div>
          <div className="aqi-advice">
            <strong>{aqiInfo.advice}</strong>
            <span>{aqiInfo.detail}</span>
          </div>
        </button>

        <div className="section-title-row">
          <h2>逐小時預報</h2>
          <button type="button" onClick={() => onOpenSheet("seventy-two")}>
            詳細預報 <ChevronRight size={20} />
          </button>
        </div>

        <button
          type="button"
          className="hourly-card"
          onClick={() => onOpenSheet("seventy-two")}
          aria-label="查看 72 小時詳細預報"
        >
          {hourly.map((hour, index) => (
            <div className="hour-item" key={hour.time}>
              <span>{index === 0 ? "現在" : `${Number(formatTaipeiTime(hour.time).slice(0, 2))}時`}</span>
              <WeatherIcon
                description={hour.weatherDescription}
                precipitation={hour.precipitationProbability}
                size={30}
                className={hour.weatherDescription.includes("晴") ? "sun-icon" : ""}
              />
              <b>{hour.precipitationProbability}%</b>
              <strong>{hour.temperature}°</strong>
            </div>
          ))}
        </button>

        <div className="pager-dots" aria-hidden><i /><i /><i /><i /></div>

        <div className="section-title-row advice-title">
          <h2>生活建議</h2>
          <button type="button" onClick={() => onOpenSheet("insights")}>
            更多資訊 <ChevronRight size={20} />
          </button>
        </div>
        <div className="advice-strip">
          <div><ThermometerSun /><span>舒適度</span><strong>{forecast.hourly[0]?.comfortDescription ?? "舒適"}</strong></div>
          <div><Droplets /><span>今日雨勢</span><strong>{dailyRainfall.dailyRainfall.at(-1)?.precipitation ?? 0} mm</strong></div>
          <div><Gauge /><span>氣壓</span><strong>{Math.round(observation.airPressure)} hPa</strong></div>
          <div><Sparkles /><span>熱感排名</span><strong>全台 #{heat.rank}</strong></div>
        </div>
      </section>

      <nav className="bottom-nav" aria-label="主要導覽">
        <button type="button" className="active" aria-current="page">
          <span><House size={24} fill="currentColor" /></span>天氣
        </button>
        <button type="button" onClick={onOpenRadar}>
          <span><Map size={25} fill="currentColor" /></span>圖資
        </button>
      </nav>
    </main>
  );
}
