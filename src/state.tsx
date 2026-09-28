import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchWeatherBundle, type Coordinates, type WeatherBundle } from "./lib/api";
import type { Scheme } from "./lib/colors";
import { CURRENT_LOCATION, isSavedLocation, type SavedLocation } from "./lib/locations";

export const SECTIONS = ["metrics", "aqi", "hourly", "life", "weekly", "extras", "sun"] as const;
export type SectionId = (typeof SECTIONS)[number];
export const SECTION_LABELS: Record<SectionId, string> = {
  metrics: "近一小時降雨、紫外線、體感溫度",
  aqi: "空氣品質",
  hourly: "72 小時預報",
  life: "生活建議",
  weekly: "7 日預報",
  extras: "累積降雨、風速、氣壓",
  sun: "日出日落",
};

export type Theme = "system" | "light" | "dark";
type Prefs = { theme: Theme; order: SectionId[]; hidden: SectionId[] };
const DEFAULT_PREFS: Prefs = { theme: "system", order: [...SECTIONS], hidden: [] };

export type WeatherEntry = { status: "loading" | "ok" | "error"; data?: WeatherBundle; updatedAt?: number };
export type GeoState = { status: "idle" | "locating" | "ok" | "denied" | "timeout" | "unavailable"; coords?: Coordinates };

const STORAGE = { prefs: "tw-weather.prefs.v2", locations: "tw-weather.locations.v2" };

function load<T>(key: string, fallback: T, validate: (v: unknown) => T | null): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return validate(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}

function parsePrefs(v: unknown): Prefs | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Partial<Prefs>;
  const valid = (s: unknown): s is SectionId => SECTIONS.includes(s as SectionId);
  const order = Array.isArray(p.order) ? [...new Set(p.order.filter(valid))] : [];
  return {
    theme: p.theme === "light" || p.theme === "dark" ? p.theme : "system",
    order: [...order, ...SECTIONS.filter((s) => !order.includes(s))],
    hidden: Array.isArray(p.hidden) ? [...new Set(p.hidden.filter(valid))] : [],
  };
}

function parseLocations(v: unknown): SavedLocation[] | null {
  if (!Array.isArray(v)) return null;
  const list = v.filter(isSavedLocation);
  return list.length ? list : null;
}

type Store = {
  scheme: Scheme;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  locations: SavedLocation[];
  setLocations: (next: SavedLocation[]) => void;
  addLocation: (location: SavedLocation) => void;
  page: number;
  setPage: (index: number) => void;
  weather: Record<string, WeatherEntry>;
  ensureWeather: (location: SavedLocation, force?: boolean) => void;
  geo: GeoState;
  locate: () => void;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

const STALE_MS = 10 * 60 * 1000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(() => load(STORAGE.prefs, DEFAULT_PREFS, parsePrefs));
  const [locations, setLocationsState] = useState<SavedLocation[]>(() => load(STORAGE.locations, [CURRENT_LOCATION], parseLocations));
  const [page, setPage] = useState(0);
  const [weather, setWeather] = useState<Record<string, WeatherEntry>>({});
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  const inflight = useRef(new Map<string, AbortController>());
  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const scheme: Scheme = prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;
  useEffect(() => {
    document.documentElement.dataset.theme = scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", scheme === "dark" ? "#111111" : "#ffffff");
  }, [scheme]);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((current) => {
      const next = { ...current, ...patch };
      save(STORAGE.prefs, next);
      return next;
    });
  }, []);

  const setLocations = useCallback((next: SavedLocation[]) => {
    setLocationsState(next);
    save(STORAGE.locations, next);
    setPage((p) => Math.min(p, Math.max(0, next.length - 1)));
  }, []);

  const addLocation = useCallback((location: SavedLocation) => {
    setLocationsState((current) => {
      const exists = current.findIndex((l) => l.id === location.id);
      const next = exists >= 0 ? current : [...current, location];
      save(STORAGE.locations, next);
      setPage(exists >= 0 ? exists : next.length - 1);
      return next;
    });
  }, []);

  const load_ = useCallback((key: string, coords: Coordinates, force = false) => {
    const entry = weatherRef.current[key];
    if (!force && entry && (entry.status === "loading" || (entry.updatedAt && Date.now() - entry.updatedAt < STALE_MS))) return;
    inflight.current.get(key)?.abort();
    const controller = new AbortController();
    inflight.current.set(key, controller);
    setWeather((w) => ({ ...w, [key]: { ...w[key], status: w[key]?.data ? "ok" : "loading" } }));
    fetchWeatherBundle(coords, controller.signal)
      .then((data) => setWeather((w) => ({ ...w, [key]: { status: "ok", data, updatedAt: Date.now() } })))
      .catch(() => {
        if (!controller.signal.aborted) setWeather((w) => ({ ...w, [key]: { ...w[key], status: w[key]?.data ? "ok" : "error" } }));
      });
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeo({ status: "unavailable" });
      return;
    }
    setGeo((g) => ({ ...g, status: g.coords ? "ok" : "locating" }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { latitude: Number(position.coords.latitude.toFixed(5)), longitude: Number(position.coords.longitude.toFixed(5)) };
        setGeo({ status: "ok", coords });
      },
      (error) => setGeo((g) => (g.coords ? g : { status: error.code === error.TIMEOUT ? "timeout" : error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" })),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  const ensureWeather = useCallback((location: SavedLocation, force = false) => {
    if (location.kind === "current") {
      if (geo.coords) load_("current", geo.coords, force);
      else if (geo.status === "idle") locate();
      return;
    }
    if (location.coordinates) load_(location.id, location.coordinates, force);
  }, [geo.coords, geo.status, load_, locate]);

  useEffect(() => {
    if (geo.coords) load_("current", geo.coords, true);
  }, [geo.coords, load_]);

  const value = useMemo<Store>(() => ({
    scheme, prefs, setPrefs, locations, setLocations, addLocation, page, setPage, weather, ensureWeather, geo, locate,
  }), [scheme, prefs, setPrefs, locations, setLocations, addLocation, page, weather, ensureWeather, geo, locate]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const weatherKey = (location: SavedLocation) => (location.kind === "current" ? "current" : location.id);
