export const API_BASE = "https://api.taiwanweather.app/v1";

export type Coordinates = { latitude: number; longitude: number };

export type WeatherObservation = {
  stationId: string;
  stationName: string;
  county: string;
  township: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  airPressure: number;
  uvIndex?: { value: number; observedAt?: string } | null;
  weatherShortDescription?: string | null;
  precipitation?: { now: number; observedAt: string } | null;
  observedAt: string;
};

export type HourlyForecast = {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitationProbability: number;
  comfort: string;
  comfortDescription: string;
  beaufortScale: string;
  windDirection: string;
  weatherDescription: string;
  weatherCode: number;
};

export type DailyForecast = {
  date: string;
  maxTemperature: number;
  minTemperature: number;
  maxFeelsLike: number;
  minFeelsLike: number;
  uvIndex: number;
  uvDescription: string;
  precipitationProbability: number;
  beaufortScale: string;
  weatherDescription: string;
  weatherCode: number;
  description: string;
};

export type DailyForecastSegment = DailyForecast & {
  period: "daytime" | "nighttime";
  startTime: string;
  endTime: string;
};

export type WeatherForecast = {
  locationId: string;
  locationName: string;
  city?: string | null;
  level: string;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  dailySegments: DailyForecastSegment[];
  forecastPeriods?: Array<Record<string, unknown>>;
  sun?: {
    dawnTime?: string;
    riseTime?: string;
    noonTime?: string;
    setTime?: string;
    duskTime?: string;
  } | null;
};

export type AQIObservation = {
  stationId: string;
  stationName: string;
  county: string;
  latitude: number;
  longitude: number;
  source?: string;
  publishedAt?: string;
  aqi: number;
  status?: string;
  o3?: { current?: number | null; "8hr"?: number | null };
  pm25?: { current?: number | null; average?: number | null };
  pm10?: { current?: number | null; average?: number | null };
  co?: { current?: number | null; "8hr"?: number | null };
  so2?: { current?: number | null; average?: number | null };
  no2?: { current?: number | null } | number;
};

export type RainfallStation = {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  county?: string;
  town?: string;
  city?: string;
  distanceKm: number;
};

export type HourlyRainfall = {
  date: string;
  timezone: string;
  station: RainfallStation;
  hourlyRainfall: Array<{
    hour: number;
    periodStart: string;
    periodEnd: string;
    observedAt: string;
    precipitation: number;
  }>;
};

export type DailyRainfall = {
  dateRange: { start: string; end: string; timezone: string };
  historicalStation: RainfallStation;
  dailyRainfall: Array<{
    date: string;
    precipitation: number | null;
    status: string;
    source: string;
  }>;
};

export type HeatCard = {
  locationId: string;
  city: string;
  district: string;
  displayLocationName: string;
  rank: number;
  rankText: string;
  total: number;
  overtakesPercent: number;
  beatText: string;
  beatHighlightText: string;
  temperature: number;
  feelsLike: number;
  observedAt: string;
  forecastTime: string;
  subtitle?: string;
};

export type TemperatureImage = {
  id: number;
  type: string;
  dateTime: string;
  url?: string | null;
  r2Url: string;
  width?: number;
  height?: number;
};

export type TemperatureRanking = {
  rank: number;
  temperatureC: number;
  observedAt: string;
  stationName: string;
  stationId: string;
  address: string;
};

export type TemperatureLeaderboard = {
  generatedAt: string;
  total: number;
  districtTotal: number;
  skippedCount: number;
  data: HeatCard[];
};

export type RadarFrame = {
  id: number;
  type: string;
  dateTime: string;
  url: string;
  r2Url?: string;
  width?: number;
  height?: number;
};

export type WeatherBundle = {
  observation: WeatherObservation;
  forecast: WeatherForecast;
  aqi: AQIObservation;
  hourlyRainfall: HourlyRainfall;
  dailyRainfall: DailyRainfall;
  heat: HeatCard;
};

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Weather API ${response.status}`);
  return response.json() as Promise<T>;
}

function coordinateQuery(coords: Coordinates) {
  return `latitude=${coords.latitude}&longitude=${coords.longitude}`;
}

export async function fetchWeatherBundle(
  coords: Coordinates,
  signal?: AbortSignal,
): Promise<WeatherBundle> {
  const query = coordinateQuery(coords);
  const forecastPromise = getJson<WeatherForecast>(
    `/weather/forecast?${query}`,
    signal,
  );
  const independentPromise = Promise.all([
    getJson<WeatherObservation>(`/weather/observation?${query}`, signal),
    getJson<AQIObservation>(`/aqi?${query}`, signal),
    getJson<HourlyRainfall>(`/rainfall/hourly?${query}`, signal),
    getJson<DailyRainfall>(`/rainfall/daily?${query}`, signal),
  ]);

  const forecast = await forecastPromise;
  const heatPromise = getJson<HeatCard>(
    `/weather/heat-card?locationId=${forecast.locationId}`,
    signal,
  );
  const [[observation, aqi, hourlyRainfall, dailyRainfall], heat] =
    await Promise.all([independentPromise, heatPromise]);

  return { observation, forecast, aqi, hourlyRainfall, dailyRainfall, heat };
}

export function fetchAqiStations(signal?: AbortSignal) {
  return getJson<AQIObservation[]>("/aqi/stations", signal);
}

export function fetchAqiByStation(stationId: string, signal?: AbortSignal) {
  return getJson<AQIObservation>(
    `/aqi?stationId=${encodeURIComponent(stationId)}`,
    signal,
  );
}

export function fetchTemperatureImage(signal?: AbortSignal) {
  return getJson<TemperatureImage>(
    "/weather/temperature-images/latest",
    signal,
  );
}

export function fetchTemperatureRankings(signal?: AbortSignal) {
  return getJson<TemperatureRanking[]>(
    "/weather/temperature-top-100",
    signal,
  );
}

export function fetchTemperatureLeaderboard(signal?: AbortSignal) {
  return getJson<TemperatureLeaderboard>(
    "/weather/temperature/leaderboard-now",
    signal,
  );
}

export async function fetchRadarFrames(
  type: string,
  limit = 73,
  signal?: AbortSignal,
) {
  const response = await getJson<{ data: RadarFrame[] }>(
    `/weather/radar-images?type=${encodeURIComponent(type)}&limit=${limit}`,
    signal,
  );
  return response.data.toReversed();
}

export const DEFAULT_COORDS: Coordinates = {
  latitude: 25.02677,
  longitude: 121.54338,
};

export function formatTaipeiTime(value?: string | null, withDate = false) {
  if (!value) return "--";
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    ...(withDate
      ? { year: "numeric", month: "2-digit", day: "2-digit" }
      : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T12:00:00+08:00`));
}

export function aqiStatus(value: number) {
  if (value <= 50)
    return { label: "良好", color: "#72df68", advice: "適合外出", detail: "適合慢跑、騎車等戶外運動" };
  if (value <= 100)
    return { label: "普通", color: "#f5cf57", advice: "正常活動", detail: "敏感族群建議留意身體狀況" };
  if (value <= 150)
    return { label: "對敏感族群不健康", color: "#ff9f43", advice: "減少久待", detail: "敏感族群請減少長時間戶外活動" };
  return { label: "不健康", color: "#ee5f5b", advice: "減少外出", detail: "建議配戴口罩並避免劇烈活動" };
}

export function windDirectionText(degrees: number) {
  const labels = ["北風", "東北風", "東風", "東南風", "南風", "西南風", "西風", "西北風"];
  return labels[Math.round(degrees / 45) % 8];
}
