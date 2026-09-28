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
  precipitationProbability: number | null;
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
  uvIndex: number | null;
  uvDescription: string | null;
  precipitationProbability: number | null;
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

export type LifeSuggestion = { id: string; text: string };

export type ForecastPeriod = {
  startTime: string;
  endTime: string;
  weatherDescription: string;
  weatherCode: number;
  precipitationProbability: number | null;
  minTemperature: number;
  maxTemperature: number;
  comfort: string;
  period: string;
  icons: LifeSuggestion[];
};

export type WeatherForecast = {
  locationId: string;
  locationName: string;
  city?: string | null;
  level: string;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  dailySegments: DailyForecastSegment[];
  forecastPeriods?: ForecastPeriod[];
  sun?: { dawnTime?: string; riseTime?: string; noonTime?: string; setTime?: string; duskTime?: string } | null;
};

export type AQIObservation = {
  stationId: string;
  stationName: string;
  county: string;
  latitude: number;
  longitude: number;
  aqi: number;
};

export type HourlyRainfall = {
  date: string;
  hourlyRainfall: Array<{ hour: number; precipitation: number | null }>;
};

export type WeatherBundle = {
  observation: WeatherObservation | null;
  forecast: WeatherForecast;
  aqi: AQIObservation | null;
  hourlyRainfall: HourlyRainfall | null;
  fetchedAt: string;
};

export type TemperatureImage = { dateTime: string; url?: string | null; r2Url: string; width?: number; height?: number };

export type TemperatureRanking = { rank: number; temperatureC: number; observedAt: string; stationName: string };

export type LeaderboardEntry = {
  locationId: string;
  displayLocationName: string;
  rank: number;
  temperature: number;
  feelsLike: number;
};

export type RadarFrame = { id: number; dateTime: string; url: string; r2Url?: string };

export type WeatherAdvisory = {
  id: string;
  type: string;
  title: string;
  headline: string;
  severityLevel: string;
  color: string;
  effectiveAt: string;
  expiresAt: string;
  description: string;
  instruction: string;
  webUrl?: string | null;
};

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(20000);
  const response = await fetch(`${API_BASE}${path}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Weather API ${response.status}`);
  return response.json() as Promise<T>;
}

const query = (c: Coordinates) => `latitude=${c.latitude}&longitude=${c.longitude}`;

export async function fetchWeatherBundle(coords: Coordinates, signal?: AbortSignal): Promise<WeatherBundle> {
  const optional = <T,>(path: string) =>
    getJson<T>(path, signal).catch((error: unknown) => {
      if (signal?.aborted) throw error;
      return null;
    });
  const q = query(coords);
  const [forecast, observation, aqi, hourlyRainfall] = await Promise.all([
    getJson<WeatherForecast>(`/weather/forecast?${q}`, signal),
    optional<WeatherObservation>(`/weather/observation?${q}`),
    optional<AQIObservation>(`/aqi?${q}`),
    optional<HourlyRainfall>(`/rainfall/hourly?${q}`),
  ]);
  return { forecast, observation, aqi, hourlyRainfall, fetchedAt: new Date().toISOString() };
}

export const fetchTemperatureImage = (signal?: AbortSignal) =>
  getJson<TemperatureImage>("/weather/temperature-images/latest", signal);

export const fetchTemperatureTop100 = (signal?: AbortSignal) =>
  getJson<TemperatureRanking[]>("/weather/temperature-top-100", signal);

export const fetchLeaderboardNow = (signal?: AbortSignal) =>
  getJson<{ data: LeaderboardEntry[] }>("/weather/temperature/leaderboard-now", signal).then((r) => r.data);

export async function fetchRadarFrames(type: string, limit: number, signal?: AbortSignal) {
  const response = await getJson<{ data: RadarFrame[] }>(
    `/weather/radar-images?type=${encodeURIComponent(type)}&limit=${limit}`,
    signal,
  );
  return [...response.data].reverse();
}

export const fetchAdvisories = (signal?: AbortSignal) =>
  getJson<{ data: { advisories: WeatherAdvisory[] } }>("/weather/advisories", signal).then((r) => r.data.advisories);

/** CWA uses -99 style sentinels for missing observations. */
export function reading(value: number | null | undefined, nonnegative = false): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > -90 && (!nonnegative || value >= 0) ? value : null;
}
