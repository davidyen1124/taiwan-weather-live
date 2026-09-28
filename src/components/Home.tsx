import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { reading, upcomingHours, upcomingPeriods, type WeatherBundle } from "../lib/api";
import { glyphIcon, heroArt, isNightHour, periodIcon, suggestionIcon, weatherKind } from "../lib/assets";
import { aqiColor, aqiInfo, aqiLevel, temperatureColor, uvColor, uvLabel, type Scheme } from "../lib/colors";
import { dateKey, hhmm, hourLabel, minutesOfDay, monthDay, taipei, weekdayName, windDirectionText } from "../lib/format";
import type { SavedLocation } from "../lib/locations";
import { useStore, weatherKey, type SectionId } from "../state";
import { ErrorBoundary } from "./ErrorBoundary";
import { Glyph, Symbol } from "./ui";

export type HomeActions = {
  openDrawer: () => void;
  openWeek: (date?: string) => void;
  openHourly: () => void;
  openAqiHelp: () => void;
  openAddLocation: () => void;
};

const HERO = 357;
const HERO_COLLAPSED = 242;

export function HomeScreen(actions: HomeActions) {
  const { locations, page, setPage } = useStore();
  const pagerRef = useRef<HTMLDivElement>(null);
  const scrolling = useRef(false);

  // Only jump the pager when the page changes from elsewhere (drawer, page dots, locate).
  // Page changes that come from the user's own swipe must not fight the scroll.
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    if (scrolling.current) { scrolling.current = false; return; }
    const target = page * pager.clientWidth;
    if (Math.abs(pager.scrollLeft - target) > 2) pager.scrollTo({ left: target, behavior: "instant" as ScrollBehavior });
  }, [page, locations.length]);

  const onScroll = () => {
    const pager = pagerRef.current;
    if (!pager) return;
    const index = Math.round(pager.scrollLeft / pager.clientWidth);
    if (index !== page) {
      scrolling.current = true;
      setPage(index);
    }
  };

  return (
    <main className="home">
      <div className="pager" ref={pagerRef} onScroll={onScroll}>
        {locations.map((location, index) => (
          <ErrorBoundary key={location.id} className="location-page"><LocationPage location={location} active={index === page} actions={actions} /></ErrorBoundary>
        ))}
      </div>
      {locations.length > 1 ? (
        <div className="page-control" aria-label={`第 ${page + 1} 頁，共 ${locations.length} 頁`}>
          {locations.map((location, index) => (
            <button key={location.id} type="button" aria-label={`${location.city}${location.name}`}
              className={`page-dot ${index === page ? "current" : ""} ${location.located ? "is-location" : ""}`} onClick={() => setPage(index)}>
              {location.located ? <Symbol name="locationFill" size={17} /> : <span />}
            </button>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function LocationPage({ location, active, actions }: { location: SavedLocation; active: boolean; actions: HomeActions }) {
  const { weather, ensureWeather, scheme, prefs } = useStore();
  const entry = weather[weatherKey(location)];
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (active) ensureWeather(location);
  }, [active, location, ensureWeather]);

  useEffect(() => {
    if (!active) return;
    const onVisible = () => { if (document.visibilityState === "visible") ensureWeather(location); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [active, ensureWeather, location]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || !pageRef.current) return;
    const p = Math.min(1, Math.max(0, el.scrollTop / (HERO - HERO_COLLAPSED)));
    pageRef.current.style.setProperty("--p", String(p));
    pageRef.current.classList.toggle("collapsed", p >= 1);
  };

  const data = entry?.data;

  return (
    <section className="location-page" ref={pageRef} aria-label={`${location.city}${location.name}`}>
      {data ? (
        <>
          <Hero data={data} location={location} onMenu={actions.openDrawer} />
          <div className="page-scroll" ref={scrollRef} onScroll={onScroll}>
            <div className="hero-spacer" />
            <p className="source-line">資料來源時間：{hhmm(data.observation?.observedAt ?? data.forecast.hourly[0]?.time)} ・上次更新：{hhmm(data.fetchedAt)}</p>
            {prefs.order.filter((id) => !prefs.hidden.includes(id)).map((id) => (
              <Section key={id} id={id} data={data} scheme={scheme} actions={actions} />
            ))}
            <p className="footer-source">資料來源：中央氣象署、環保署、各地方政府環保局</p>
          </div>
        </>
      ) : entry?.status === "error" ? (
        <LoadError onMenu={actions.openDrawer} onRetry={() => ensureWeather(location, true)} />
      ) : (
        <Loading onMenu={actions.openDrawer} />
      )}
    </section>
  );
}

function MenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="menu-button" aria-label="開啟地點列表" onClick={onClick}>
      <Glyph name="icon_hamburgur" size={24} />
    </button>
  );
}

function Hero({ data, location, onMenu }: { data: WeatherBundle; location: SavedLocation; onMenu: () => void }) {
  const { forecast, observation } = data;
  const now = upcomingHours(forecast.hourly)[0];
  const today = forecast.daily[0];
  const temperature = reading(observation?.temperature) ?? now?.temperature ?? null;
  const humidity = reading(observation?.humidity, true) ?? now?.humidity ?? null;
  const direction = reading(observation?.windDirection, true);
  const night = isNightHour(taipei().hour);
  const period = forecast.forecastPeriods?.[0];
  const kind = weatherKind(now?.weatherCode ?? period?.weatherCode ?? 4, now?.weatherDescription ?? period?.weatherDescription);
  const title = location.kind === "mountain" ? location.name : `${forecast.city ?? location.city} ${forecast.locationName}`;

  return (
    <header className="hero">
      <img className="hero-art" src={heroArt(kind, night)} alt="" aria-hidden />
      <MenuButton onClick={onMenu} />
      <h1 className="hero-title">
        {title}
        {location.located ? <Symbol name="locationFill" size={16} className="hero-location-arrow" /> : null}
      </h1>
      <p className="hero-temp">{temperature === null ? "--" : Math.round(temperature)}°</p>
      <p className="hero-range">最高 {today ? Math.round(today.maxTemperature) : "--"}° • 最低 {today ? Math.round(today.minTemperature) : "--"}°</p>
      <p className="hero-wind">{direction !== null ? windDirectionText(direction) : now?.windDirection ?? "--"} • 濕度 {humidity === null ? "--" : Math.round(humidity)}%</p>
    </header>
  );
}

function Section({ id, data, scheme, actions }: { id: SectionId; data: WeatherBundle; scheme: Scheme; actions: HomeActions }) {
  switch (id) {
    case "metrics": return <MetricTiles data={data} scheme={scheme} />;
    case "aqi": return <AqiCard data={data} scheme={scheme} onHelp={actions.openAqiHelp} />;
    case "hourly": return <HourlyCard data={data} onDetail={actions.openHourly} />;
    case "life": return <LifeCard data={data} />;
    case "weekly": return <WeeklyCard data={data} scheme={scheme} onDetail={actions.openWeek} />;
    case "extras": return <ExtraTiles data={data} />;
    case "sun": return <SunCard data={data} />;
  }
}

function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ background: color }} />;
}

function Tile({ label, children, unit }: { label: string; children: ReactNode; unit?: string }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{children}</span>
      {unit ? <span className="tile-unit">{unit}</span> : null}
    </div>
  );
}

function MetricTiles({ data, scheme }: { data: WeatherBundle; scheme: Scheme }) {
  const now = upcomingHours(data.forecast.hourly)[0];
  const uv = reading(data.observation?.uvIndex?.value, true);
  const feels = now?.feelsLike ?? null;
  return (
    <div className="tile-row">
      <Tile label="近一小時降雨">{now?.precipitationProbability == null ? "--" : `${now.precipitationProbability}%`}</Tile>
      <Tile label="紫外線">{uv === null ? <span className="tile-empty">--</span> : <><Dot color={uvColor(uv, scheme)} />{Math.round(uv)}<small>{uvLabel(uv)}</small></>}</Tile>
      <Tile label="體感溫度">{feels === null ? "--" : <><Dot color={temperatureColor(feels, scheme)} />{Math.round(feels)}°</>}</Tile>
    </div>
  );
}

function AqiCard({ data, scheme, onHelp }: { data: WeatherBundle; scheme: Scheme; onHelp: () => void }) {
  const aqi = data.aqi && data.aqi.aqi >= 0 ? data.aqi.aqi : null;
  const info = aqiInfo(aqi);
  const level = aqiLevel(aqi);
  const color = aqiColor(aqi, scheme);
  return (
    <div className="card aqi-card">
      <div className="aqi-head">
        <span className="aqi-label">空氣品質 AQI</span>
        <span className="aqi-source">資料來源 {data.aqi?.stationName ? data.aqi.stationName.replace(/站$/, "") + "測站" : "--"}</span>
      </div>
      <div className="aqi-value-row">
        <span className="aqi-value"><Dot color={color} />{aqi ?? "--"}<small>{info.status}</small></span>
        <span className="aqi-bar" aria-hidden>
          {[0, 1, 2, 3].map((i) => <span key={i} style={i === level ? { background: color } : undefined} />)}
        </span>
      </div>
      <div className="aqi-advice">
        <div className="aqi-advice-head">
          <strong>空氣品質建議</strong>
          <button type="button" aria-label="空氣品質建議說明" onClick={onHelp}><Symbol name="question" size={20} strokeWidth={1.5} /></button>
        </div>
        <p className="aqi-advice-title">{info.title}</p>
        <p className="aqi-advice-detail">{info.detail}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, onDetail }: { title: string; onDetail?: () => void }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {onDetail ? (
        <button type="button" onClick={onDetail}>詳細預報<Glyph name="icon_chevron_right" size={16} /></button>
      ) : null}
    </div>
  );
}

function HourlyCard({ data, onDetail }: { data: WeatherBundle; onDetail: () => void }) {
  const hours = upcomingHours(data.forecast.hourly).slice(0, 24);
  return (
    <section className="home-section">
      <SectionHeader title="逐小時預報" onDetail={onDetail} />
      <div className="card hourly-card">
        <div className="hourly-strip">
          {hours.map((hour, index) => {
            const night = isNightHour(taipei(hour.time).hour);
            return (
              <div className="hourly-item" key={hour.time}>
                <span className="hourly-time">{hourLabel(hour.time, index)}</span>
                <Glyph name={glyphIcon(hour.weatherCode, night, hour.weatherDescription)} size={26} />
                <span className="hourly-temp">{Math.round(hour.temperature)}°</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LifeCard({ data }: { data: WeatherBundle }) {
  const periods = upcomingPeriods(data.forecast.forecastPeriods);
  if (!periods.length) return null;
  return (
    <section className="home-section">
      <SectionHeader title="生活建議" />
      <div className="life-scroller">
        {periods.map((period) => {
          const night = period.night;
          return (
            <div className="card life-card" key={period.startTime}>
              <div className="life-top">
                <div>
                  <p className="life-period">{period.label}</p>
                  <p className="life-range">{period.minTemperature} - {period.maxTemperature}°</p>
                  <p className="life-rain">降雨 {period.precipitationProbability ?? "--"}%</p>
                </div>
                <div className="life-weather">
                  <img src={periodIcon(period.weatherCode, night, period.weatherDescription)} alt="" />
                  <span>{period.comfort}</span>
                </div>
              </div>
              <div className="life-icons">
                {period.icons.map((icon) => (
                  <div className="life-icon" key={icon.id}>
                    <Glyph name={suggestionIcon(icon.id, icon.text)} size={26} />
                    <span>{icon.text}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeeklyCard({ data, scheme, onDetail }: { data: WeatherBundle; scheme: Scheme; onDetail: (date?: string) => void }) {
  const days = data.forecast.daily.slice(0, 7);
  const min = Math.min(...days.map((d) => d.minTemperature));
  const max = Math.max(...days.map((d) => d.maxTemperature));
  const span = Math.max(1, max - min);
  return (
    <section className="home-section">
      <SectionHeader title="7 日預報" onDetail={() => onDetail()} />
      <div className="card weekly-card">
        {days.map((day) => {
          const from = ((day.minTemperature - min) / span) * 100;
          const to = ((day.maxTemperature - min) / span) * 100;
          return (
            <div className="weekly-row" key={day.date}>
              <div className="weekly-day">
                <strong>{weekdayName(day.date)}</strong>
                <span>{monthDay(day.date)}</span>
              </div>
              <div className="weekly-icon">
                <img src={periodIcon(day.weatherCode, false, day.weatherDescription)} alt={day.weatherDescription} />
                {day.precipitationProbability ? <span>{day.precipitationProbability}%</span> : null}
              </div>
              <div className="weekly-temps">
                <div className="weekly-range">
                  <strong>{Math.round(day.minTemperature)}°</strong>
                  <span className="temp-track">
                    <span className="temp-fill" style={{
                      left: `${from}%`, right: `${100 - to}%`,
                      background: `linear-gradient(90deg, ${temperatureColor(day.minTemperature, scheme)}, ${temperatureColor(day.maxTemperature, scheme)})`,
                    }} />
                  </span>
                  <strong>{Math.round(day.maxTemperature)}°</strong>
                </div>
                <span className="weekly-meta">紫外線 {day.uvIndex ?? "--"}&nbsp;&nbsp;體感 {Math.round(day.minFeelsLike)}°/{Math.round(day.maxFeelsLike)}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExtraTiles({ data }: { data: WeatherBundle }) {
  const today = dateKey(Date.now());
  const rain = data.hourlyRainfall?.date === today
    ? data.hourlyRainfall.hourlyRainfall.reduce<number | null>((sum, h) => (h.precipitation == null || h.precipitation < 0 ? sum : (sum ?? 0) + h.precipitation), null)
    : null;
  const wind = reading(data.observation?.windSpeed, true);
  const pressure = reading(data.observation?.airPressure, true);
  return (
    <div className="tile-row extra-row">
      <Tile label="今天累積降雨" unit={rain === null ? undefined : "mm"}>{rain === null ? <span className="tile-empty">--</span> : Math.round(rain * 10) / 10}</Tile>
      <Tile label="風速" unit="m/s">{wind === null ? "--" : wind.toFixed(1)}</Tile>
      <Tile label="氣壓" unit="hPa">{pressure === null ? "--" : pressure.toFixed(1)}</Tile>
    </div>
  );
}

function SunCard({ data }: { data: WeatherBundle }) {
  const sun = data.forecast.sun;
  const rise = sun?.riseTime ?? "05:45";
  const set = sun?.setTime ?? "17:45";
  const nowMinutes = (() => { const p = taipei(); return p.hour * 60 + p.minute; })();
  const g = useMemo(() => sunGeometry(minutesOfDay(rise), minutesOfDay(set), nowMinutes), [rise, set, nowMinutes]);
  return (
    <div className="card sun-card">
      <Symbol name="sunrise" size={20} strokeWidth={1.5} className="sun-icon rise" />
      <Symbol name="sunset" size={20} strokeWidth={1.5} className="sun-icon set" />
      <strong className="sun-time rise">{rise}</strong>
      <strong className="sun-time set">{set}</strong>
      <svg className="sun-curve" viewBox="0 0 350.8 151.5" aria-hidden>
        <defs>
          <linearGradient id="sun-stroke" gradientUnits="userSpaceOnUse" x1="67.5" x2="282.5" y1="0" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.36" stopColor="currentColor" stopOpacity="1" />
            <stop offset="0.64" stopColor="currentColor" stopOpacity="1" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="29.3" x2="321.5" y1="113.9" y2="113.9" className="sun-horizon" />
        <path d={g.path} stroke="url(#sun-stroke)" strokeWidth="2.2" fill="none" />
        {g.dot ? <circle cx={g.dot[0]} cy={g.dot[1]} r="6" className="sun-dot" /> : null}
      </svg>
    </div>
  );
}

/** Gaussian arc measured from the app: crosses the horizon (y 113.9) at sunrise/sunset, peaks at y 81.2. */
function sunGeometry(rise: number, set: number, now: number) {
  const center = 175.4, sigma = 49, base = 136, amplitude = 54.8;
  const crossing = sigma * Math.sqrt(2 * Math.log(amplitude / (base - 113.9)));
  const yAt = (x: number) => base - amplitude * Math.exp(-((x - center) ** 2) / (2 * sigma ** 2));
  const points: string[] = [];
  for (let x = 60; x <= 291; x += 3) points.push(`${x.toFixed(1)},${yAt(x).toFixed(2)}`);
  const perMinute = (2 * crossing) / Math.max(1, set - rise);
  const x = center - crossing + (now - rise) * perMinute;
  const dot = x >= 60 && x <= 291 ? [x, yAt(x)] as const : null;
  return { path: `M${points.join(" L")}`, dot };
}

function HeroShell({ onMenu, children }: { onMenu: () => void; children: ReactNode }) {
  return (
    <div className="state-screen">
      <MenuButton onClick={onMenu} />
      <div className="state-body">{children}</div>
    </div>
  );
}

function Loading({ onMenu }: { onMenu: () => void }) {
  return <HeroShell onMenu={onMenu}><span className="spinner" aria-label="載入中" /></HeroShell>;
}

function LoadError({ onMenu, onRetry }: { onMenu: () => void; onRetry: () => void }) {
  return (
    <HeroShell onMenu={onMenu}>
      <strong>天氣資料無法載入</strong>
      <button type="button" className="pill-button" onClick={onRetry}>重新整理</button>
    </HeroShell>
  );
}

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => matchMedia("(min-width: 700px)").matches);
  useEffect(() => {
    const m = matchMedia("(min-width: 700px)");
    const on = () => setDesktop(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return desktop;
}
