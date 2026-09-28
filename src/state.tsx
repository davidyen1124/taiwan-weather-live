import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchWeatherBundle, type Coordinates, type WeatherBundle } from "./lib/api";
import type { Scheme } from "./lib/colors";
import { isSavedLocation, nearestDistrict, type SavedLocation } from "./lib/locations";

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
export type LocateError = "denied" | "timeout" | "unavailable";

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
  // Older versions stored an always-on "current location" entry; it is dropped here.
  return Array.isArray(v) ? v.filter(isSavedLocation) : null;
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
  /** Only ever called from a user tap — the site never asks for location on its own. */
  locateMe: () => Promise<boolean>;
  locating: boolean;
  locateError: LocateError | null;
  clearLocateError: () => void;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

const STALE_MS = 10 * 60 * 1000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(() => load(STORAGE.prefs, DEFAULT_PREFS, parsePrefs));
  const [locations, setLocationsState] = useState<SavedLocation[]>(() => load(STORAGE.locations, [], parseLocations));
  const [page, setPage] = useState(0);
  const [weather, setWeather] = useState<Record<string, WeatherEntry>>({});
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<LocateError | null>(null);
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

  const ensureWeather = useCallback((location: SavedLocation, force = false) => {
    load_(location.id, location.coordinates, force);
  }, [load_]);

  // Fetch every favourite up front so swiping between pages never lands on a spinner.
  useEffect(() => {
    locations.forEach((location) => load_(location.id, location.coordinates));
  }, [locations, load_]);

  const locateMe = useCallback(() => new Promise<boolean>((resolve) => {
    if (!("geolocation" in navigator)) {
      setLocateError("unavailable");
      resolve(false);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const place = { ...nearestDistrict({ latitude: position.coords.latitude, longitude: position.coords.longitude }), located: true };
        setLocationsState((current) => {
          const cleared = current.map((l) => (l.located ? { ...l, located: false } : l));
          const index = cleared.findIndex((l) => l.id === place.id);
          const next = index >= 0 ? cleared.map((l, i) => (i === index ? place : l)) : [place, ...cleared];
          save(STORAGE.locations, next);
          setPage(index >= 0 ? index : 0);
          return next;
        });
        setLocating(false);
        resolve(true);
      },
      (error) => {
        setLocating(false);
        setLocateError(error.code === error.TIMEOUT ? "timeout" : error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        resolve(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  }), []);

  const clearLocateError = useCallback(() => setLocateError(null), []);

  const value = useMemo<Store>(() => ({
    scheme, prefs, setPrefs, locations, setLocations, addLocation, page, setPage, weather, ensureWeather, locateMe, locating, locateError, clearLocateError,
  }), [scheme, prefs, setPrefs, locations, setLocations, addLocation, page, weather, ensureWeather, locateMe, locating, locateError, clearLocateError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const weatherKey = (location: SavedLocation) => location.id;
