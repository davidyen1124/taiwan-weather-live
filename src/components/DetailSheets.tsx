
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Droplets,
  Flame,
  Gauge,
  LineChart,
  Map,
  MapPin,
  Share2,
  Palette,
  ListOrdered,
  ThermometerSun,
  Wind,
} from "lucide-react";
import type {
  AQIObservation,
  DailyForecastSegment,
  TemperatureLeaderboard,
  TemperatureRanking,
  WeatherBundle,
} from "../lib/weather";
import {
  fetchTemperatureLeaderboard,
  fetchTemperatureRankings,
  formatDate,
  reading,
  formatTaipeiTime,
} from "../lib/weather";
import type { SheetName } from "./WeatherHome";
import { FullSheet } from "./FullSheet";
import { ForecastChart } from "./ForecastChart";
import { WeatherIcon } from "./WeatherIcon";

type Props = {
  initialDate?: string;
  active: SheetName | null;
  data: WeatherBundle;
  onClose: () => void;
  onOpenRadar: () => void;
  onNavigate: (sheet: SheetName) => void;
};

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

function SevenDaySheet({ data, onClose, initialDate }: { data: WeatherBundle; onClose: () => void; initialDate?: string }) {
  const [selected, setSelected] = useState(initialDate ?? data.forecast.daily[0]?.date ?? "");
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

function SeventyTwoSheet({ data, onClose }: { data: WeatherBundle; onClose: () => void }) {
  const firstTime = Date.parse(data.forecast.hourly[0]?.time ?? "");
  const next72 = data.forecast.hourly.filter(item => Date.parse(item.time) < firstTime + 72 * 3600000);
  const dates = Array.from(new Set(next72.map((item) => item.time.slice(0, 10))));
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? "");
  const [metric, setMetric] = useState<"temperature" | "feels" | "wind" | "humidity">("temperature");
  const touchStartX = useRef<number | null>(null);
  const [selectedHour, setSelectedHour] = useState(0);
  const visible = next72.filter((item) => item.time.slice(0, 10) === selectedDate);
  const series = visible.map((item) => {
    if (metric === "feels") return item.feelsLike;
    if (metric === "wind") return Number.parseFloat(item.beaufortScale);
    if (metric === "humidity") return item.humidity;
    return item.temperature;
  });
  const validSeries = series.map(v => reading(v)).filter(v => v !== null);
  const rain = visible.map((item) => item.precipitationProbability);
  const hourIndex = Math.min(selectedHour, Math.max(0, visible.length - 1));
  const current = visible[hourIndex];
  const chartTimes = visible.map(item => `${Number(formatTaipeiTime(item.time).slice(0, 2))}時`);
  const visibleDates = dates.slice(0, 5);

  function selectAdjacentDate(direction: -1 | 1) {
    const index = visibleDates.indexOf(selectedDate);
    const nextIndex = Math.min(
      visibleDates.length - 1,
      Math.max(0, index + direction),
    );
    if (nextIndex !== index) setSelectedDate(visibleDates[nextIndex]);
  }

  return (
    <FullSheet title="72 小時預報" onClose={onClose} className="chart-sheet" closePosition="right">
      <DayTabs dates={visibleDates} selected={selectedDate} onSelect={date => { setSelectedDate(date); setSelectedHour(0); }} />
      <div
        className="forecast-day-page"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null || (event.target as Element).closest(".interactive-forecast-chart")) return;
          const distance = event.changedTouches[0]?.clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(distance) < 48) return;
          selectAdjacentDate(distance < 0 ? 1 : -1);
        }}
      >
        <h3 className="selected-date-title">{selectedDate ? formatDate(selectedDate) : "--"}</h3>
        <p className="swipe-date-hint">左右滑動切換日期 · 拖曳圖表查看每小時</p>
        <div className="segmented-control metric-tabs">
        <button type="button" className={metric === "temperature" ? "active" : ""} onClick={() => setMetric("temperature")}>實際氣溫</button>
        <button type="button" className={metric === "feels" ? "active" : ""} onClick={() => setMetric("feels")}>體感溫度</button>
        <button type="button" className={metric === "wind" ? "active" : ""} onClick={() => setMetric("wind")}>蒲福風級</button>
        <button type="button" className={metric === "humidity" ? "active" : ""} onClick={() => setMetric("humidity")}>濕度</button>
        </div>

        <div className={`chart-summary ${metric === "wind" || metric === "humidity" ? "compact-metric" : ""}`}>
          <div>
            <time>{current ? formatTaipeiTime(current.time) : "--"}</time>
            <strong>{current ? reading(series[hourIndex]) ?? "--" : "--"}{metric === "wind" ? " 級" : metric === "humidity" ? "%" : "°"}</strong>
            <span>最高 {validSeries.length ? Math.max(...validSeries) : "--"} · 最低 {validSeries.length ? Math.min(...validSeries) : "--"}</span>
          </div>
          <WeatherIcon description={current?.weatherDescription} precipitation={current?.precipitationProbability} size={50} />
        </div>

        <ForecastChart values={series} times={chartTimes} selected={hourIndex} onSelect={setSelectedHour} label="逐小時天氣曲線圖" unit={metric === "wind" ? "" : metric === "humidity" ? "%" : "°"} fixedMax={metric === "wind" ? 12 : metric === "humidity" ? 100 : undefined} />
        <div className="rain-title"><strong>降雨機率</strong><b>{reading(rain[hourIndex], true) ?? "--"}%</b></div>
        <ForecastChart values={rain} times={chartTimes} selected={hourIndex} onSelect={setSelectedHour} label="逐小時降雨機率曲線圖" unit="%" rain />

        <div className="forecast-facts">
          <div><Wind /><span>風向</span><strong>{current?.windDirection ?? "--"}</strong></div>
          <div><ThermometerSun /><span>舒適度</span><strong>{current?.comfortDescription ?? "--"}</strong></div>
        </div>
      </div>
    </FullSheet>
  );
}

function pollutantValue(aqi: AQIObservation, key: "o3" | "pm25" | "pm10" | "co" | "so2" | "no2") {
  const item = aqi[key];
  if (typeof item === "number") return reading(item, true) ?? "--";
  return reading(item?.current, true) ?? "--";
}

function AqiSheet({ data, onClose }: { data: WeatherBundle; onClose: () => void }) {
  const selected = data.aqi;
  const lat = selected.latitude;
  const lng = selected.longitude;
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
    <FullSheet title="空氣品質" onClose={onClose} className="aqi-native-sheet">
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
        <h3>測站資訊</h3>
      </div>
      <div className="station-card">
        <span>測站名稱</span>
        <strong>{selected.stationName}</strong>
        <iframe title={`${selected.stationName}地圖`} src={mapUrl} loading="lazy" />
      </div>
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
    { icon: ListOrdered, title: "自訂首頁排序", detail: "調整卡片順序與顯示項目", action: () => onNavigate("home-order") },
    { icon: Palette, title: "外觀", detail: "淺色、深色或跟隨系統", action: () => onNavigate("appearance") },
    { icon: MapPin, title: "我目前的位置", detail: "新增、移除與調整地點順序", action: () => onNavigate("locations") },
    { icon: Bell, title: "通知設定", detail: "每日天氣摘要與警特報", action: () => onNavigate("notifications") },
    { icon: CalendarDays, title: "7 日預報", detail: "每日與一週概況", action: () => onNavigate("seven-day") },
    { icon: LineChart, title: "72 小時預報", detail: "溫度、降雨與濕度曲線", action: () => onNavigate("seventy-two") },
    { icon: Gauge, title: "空氣品質", detail: "污染物與測站位置", action: () => onNavigate("aqi") },
    { icon: Droplets, title: "雨量觀測", detail: "今日逐時與近 30 日雨量", action: () => onNavigate("rainfall") },
    { icon: ThermometerSun, title: "溫度排行", detail: "今日高溫與即時體感排行", action: () => onNavigate("temperature-ranking") },
    { icon: Map, title: "即時圖資", detail: "雷達、降雨雷達與溫度分布", action: onOpenRadar },
  ];
  return (
    <FullSheet title="選單" onClose={onClose} className="menu-sheet" presentation="drawer">
      <div className="menu-list">
        {items.map((item) => (
          <button type="button" key={item.title} onClick={item.action}>
            <span><item.icon size={23} /></span>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <ChevronRight size={20} />
          </button>
        ))}
      </div>
      <p className="source-note">資料由 Taiwan Weather 提供，來源為中央氣象署與環境部。</p>
    </FullSheet>
  );
}

function RainfallSheet({
  data,
  onClose,
}: {
  data: WeatherBundle;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"hourly" | "daily">("hourly");
  const hourly = data.hourlyRainfall.hourlyRainfall;
  const daily = data.dailyRainfall.dailyRainfall;
  const [hourlyIndex, setHourlyIndex] = useState(Math.max(0, hourly.length - 1));
  const [dailyIndex, setDailyIndex] = useState(Math.max(0, daily.length - 1));
  const values =
    mode === "hourly"
      ? hourly.map((item) => item.precipitation)
      : daily.map((item) => item.precipitation ?? 0);
  const maxValue = values.length ? Math.max(...values, 1) : 1;
  const activeIndex = mode === "hourly" ? hourlyIndex : dailyIndex;
  const selected =
    mode === "hourly" ? hourly[hourlyIndex] : daily[dailyIndex];
  const station =
    mode === "hourly"
      ? data.hourlyRainfall.station.stationName
      : data.dailyRainfall.historicalStation.stationName;
  const selectedLabel =
    mode === "hourly"
      ? selected && "periodEnd" in selected
        ? formatTaipeiTime(selected.periodEnd, true)
        : "--"
      : selected && "date" in selected
        ? formatDate(selected.date)
        : "--";
  const selectedValue =
    selected && "precipitation" in selected
      ? reading(selected.precipitation, true)
      : null;

  return (
    <FullSheet title="降雨資料" onClose={onClose} className="rainfall-native-sheet" closePosition="right">
      <div className="rainfall-station">
        <span>觀測站</span>
        <strong>{station}</strong>
      </div>
      <div className="segmented-control two-column rainfall-mode">
        <button
          type="button"
          className={mode === "hourly" ? "active" : ""}
          onClick={() => setMode("hourly")}
        >
          今日降雨
        </button>
        <button
          type="button"
          className={mode === "daily" ? "active" : ""}
          onClick={() => setMode("daily")}
        >
          過去 30 天降雨
        </button>
      </div>
      <div className="rainfall-selected">
        <span>{selectedLabel}</span>
        <strong>{selectedValue ?? "--"}<small>mm</small></strong>
      </div>
      <div className={`rainfall-bars ${mode}`}>
        {values.map((value, index) => (
          <button
            type="button"
            key={mode === "hourly" ? hourly[index]?.periodStart : daily[index]?.date}
            className={activeIndex === index ? "active" : ""}
            style={{ "--bar-height": `${Math.max(3, (value / maxValue) * 100)}%` } as React.CSSProperties}
            aria-label={`${mode === "hourly" ? `${hourly[index]?.hour}時` : daily[index]?.date}：${reading(mode === "hourly" ? hourly[index]?.precipitation : daily[index]?.precipitation, true) ?? "無資料"} mm`}
            onClick={() => {
              if (mode === "hourly") setHourlyIndex(index);
              else setDailyIndex(index);
            }}
          >
            <i />
          </button>
        ))}
      </div>
      <div className="rainfall-axis">
        <span>
          {mode === "hourly"
            ? `${hourly[0]?.hour ?? 0} 時`
            : daily[0]?.date.slice(5).replace("-", "/")}
        </span>
        <span>{mode === "hourly" ? "現在" : "今天"}</span>
      </div>
      <p className="rainfall-note">
        資料來源為距離目前位置最近且有回報的自動雨量站。
      </p>
    </FullSheet>
  );
}

function TemperatureRankingSheet({
  data,
  onClose,
}: {
  data: WeatherBundle;
  onClose: () => void;
}) {
  const [rankings, setRankings] = useState<TemperatureRanking[]>([]);
  const [leaderboard, setLeaderboard] = useState<TemperatureLeaderboard | null>(null);
  const [mode, setMode] = useState<"temperature" | "feels">("temperature");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchTemperatureRankings(controller.signal),
      fetchTemperatureLeaderboard(controller.signal),
    ]).then(([nextRankings, nextLeaderboard]) => {
      setRankings(nextRankings);
      setLeaderboard(nextLeaderboard);
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const heat = leaderboard?.data.find((item) => item.locationId === data.forecast.locationId) ?? data.heat;

  return (
    <FullSheet
      title="溫度排行"
      onClose={onClose}
      className="temperature-ranking-sheet"
      headerAction={
        <button
          type="button"
          aria-label="分享溫度排行"
          onClick={() => {
            if (navigator.share) {
              void navigator.share({
                title: "台灣即時溫度排行",
                text: `目前 ${heat.displayLocationName} 體感 ${heat.feelsLike}°`,
                url: window.location.href,
              });
            } else {
              void navigator.clipboard?.writeText(window.location.href);
            }
          }}
        >
          <Share2 size={20} />
        </button>
      }
    >
      <div className="segmented-control two-column ranking-mode">
        <button
          type="button"
          className={mode === "temperature" ? "active" : ""}
          onClick={() => setMode("temperature")}
        >
          今日高溫
        </button>
        <button
          type="button"
          className={mode === "feels" ? "active" : ""}
          onClick={() => setMode("feels")}
        >
          即時體感
        </button>
      </div>

      <div className="ranking-current-card">
        <Flame />
        <div>
          <span>{heat.displayLocationName}</span>
          <strong>{heat.feelsLike}°</strong>
          <small>{heat.rank > 0 ? heat.rankText : heat.subtitle ?? heat.rankText}</small>
        </div>
      </div>

      <div className="native-ranking-list">
        {mode === "temperature"
          ? rankings.slice(0, 100).map((item) => (
              <div key={item.stationId}>
                <b>{item.rank}</b>
                <div>
                  <strong>{item.stationName}</strong>
                  <span>{item.address}</span>
                </div>
                <em>{item.temperatureC}°</em>
              </div>
            ))
          : leaderboard?.data.slice(0, 100).map((item) => (
              <div key={item.locationId}>
                <b>{item.rank}</b>
                <div>
                  <strong>{item.displayLocationName}</strong>
                  <span>實際溫度 {item.temperature}°</span>
                </div>
                <em>{item.feelsLike}°</em>
              </div>
            ))}
      </div>
    </FullSheet>
  );
}

export function DetailSheets({ active, data, onClose, onOpenRadar, onNavigate, initialDate }: Props) {
  const content = useMemo(() => {
    if (active === "seven-day") return <SevenDaySheet data={data} onClose={onClose} initialDate={initialDate} />;
    if (active === "seventy-two") return <SeventyTwoSheet data={data} onClose={onClose} />;
    if (active === "aqi") return <AqiSheet data={data} onClose={onClose} />;
    if (active === "rainfall") return <RainfallSheet data={data} onClose={onClose} />;
    if (active === "temperature-ranking") return <TemperatureRankingSheet data={data} onClose={onClose} />;
    if (active === "menu") return <MenuSheet onClose={onClose} onNavigate={onNavigate} onOpenRadar={onOpenRadar} />;
    return null;
  }, [active, data, onClose, onOpenRadar, onNavigate, initialDate]);
  return content;
}
