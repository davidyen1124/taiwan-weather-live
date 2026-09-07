"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SAVED_LOCATIONS,
  isSavedLocationsState,
  type SavedWeatherLocation,
} from "../lib/locations";
import type { Coordinates, WeatherBundle } from "../lib/weather";
import { DEFAULT_COORDS, fetchWeatherBundle } from "../lib/weather";
import { DetailSheets } from "./DetailSheets";
import { ParitySheets } from "./ParitySheets";
import { RadarView } from "./RadarView";
import { WeatherHome, type SheetName } from "./WeatherHome";
import { WeatherAdvisories } from "./WeatherAdvisories";
import type { RootView } from "./BottomNavigation";
import { WeatherNotifications } from "./WeatherNotifications";

export function WeatherApp() {
  const [data, setData] = useState<WeatherBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [forecastDate, setForecastDate] = useState<string | undefined>();
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [view, setView] = useState<RootView>("home");
  const [locations, setLocations] = useState<SavedWeatherLocation[]>(
    DEFAULT_SAVED_LOCATIONS,
  );
  const [selectedLocationId, setSelectedLocationId] =
    useState("current-location");
  const [locationsReady, setLocationsReady] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const loadWeather = useCallback(async (nextCoords: Coordinates) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const nextData = await fetchWeatherBundle(nextCoords, controller.signal);
      setData(nextData);
      setCoords(nextCoords);
      setError(null);
    } catch (nextError) {
      if ((nextError as Error)?.name !== "AbortError") {
        setError("即時資料連線不穩定，請稍後再試。");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let initialCoords = DEFAULT_COORDS;
      try {
        const saved = window.localStorage.getItem("taiwan-weather.locations.v1");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (isSavedLocationsState(parsed)) {
            setLocations(parsed.locations);
            const selected = parsed.locations.find(
              (location) => location.id === parsed.selectedLocationId,
            ) ?? parsed.locations[0];
            setSelectedLocationId(selected?.id ?? "");
            if (selected?.coordinates) initialCoords = selected.coordinates;
          }
        }
      } catch {
        // A corrupt local preference should never block weather rendering.
      } finally {
        setLocationsReady(true);
        void loadWeather(initialCoords);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [loadWeather]);

  useEffect(() => {
    if (!locationsReady) return;
    try { window.localStorage.setItem(
      "taiwan-weather.locations.v1",
      JSON.stringify({
        version: 1,
        locations,
        selectedLocationId,
      }),
    ); } catch { /* Weather remains usable when storage is disabled. */ }
  }, [locations, locationsReady, selectedLocationId]);

  useEffect(() => {
    document.body.style.overflow = sheet || view !== "home" ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheet, view]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      void loadWeather(DEFAULT_COORDS).then(() => setError("此瀏覽器不支援定位，顯示臺北市大安區。"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        loadWeather({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => {
        void loadWeather(DEFAULT_COORDS).then(() => setError("未取得定位權限，顯示臺北市大安區。"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, [loadWeather]);

  const selectLocation = useCallback(
    (location: SavedWeatherLocation) => {
      setSelectedLocationId(location.id);
      setSheet(null);
      if (location.kind === "current") {
        locate();
        return;
      }
      if (location.coordinates) loadWeather(location.coordinates);
    },
    [loadWeather, locate],
  );

  const addLocation = useCallback((location: SavedWeatherLocation) => {
    setLocations((current) =>
      current.some((item) => item.id === location.id)
        ? current
        : [...current, location],
    );
  }, []);

  const removeLocation = useCallback(
    (id: string) => {
      const remaining = locations.filter((location) => location.id !== id);
      setLocations(remaining);
      if (id === selectedLocationId) {
        const replacement = remaining[0];
        setSelectedLocationId(replacement?.id ?? "");
        if (replacement?.kind === "current") locate();
        else if (replacement?.coordinates) loadWeather(replacement.coordinates);
      }
    },
    [loadWeather, locate, locations, selectedLocationId],
  );

  const moveLocation = useCallback((id: string, direction: -1 | 1) => {
    setLocations((current) => {
      const index = current.findIndex((location) => location.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const navigateRoot = useCallback((nextView: RootView) => {
    setSheet(null);
    setView(nextView);
  }, []);

  const openSheet = useCallback((nextSheet: SheetName, date?: string) => {
    setForecastDate(date);
    setSheet(nextSheet);
  }, []);

  return (
    <div className="app-stage">
      <div className="phone-app">
        <WeatherNotifications data={data} />
        <div inert={sheet !== null}>
        {view === "radar" ? (
          <RadarView onNavigate={navigateRoot} coordinates={coords} />
        ) : view === "advisories" ? (
          <WeatherAdvisories onNavigate={navigateRoot} />
        ) : (
          <WeatherHome
            data={data}
            loading={loading}
            error={error}
            onRefresh={() => loadWeather(coords)}
            onOpenSheet={openSheet}
            onNavigate={navigateRoot}
            locations={locations}
            selectedLocationId={selectedLocationId}
            onSelectLocation={id => { const location = locations.find(l => l.id === id); if (location) selectLocation(location); }}
          />
        )}
        </div>
        {view === "home" && data ? (
          <DetailSheets
            initialDate={forecastDate}
            active={sheet}
            data={data}
            onClose={() => setSheet(null)}
            onOpenRadar={() => navigateRoot("radar")}
            onNavigate={openSheet}
          />
        ) : null}
        {view === "home" && data ? (
          <ParitySheets
            active={sheet}
            data={data}
            locations={locations}
            selectedLocationId={selectedLocationId}
            onClose={() => setSheet(null)}
            onNavigate={openSheet}
            onSelectLocation={selectLocation}
            onAddLocation={addLocation}
            onRemoveLocation={removeLocation}
            onMoveLocation={moveLocation}
          />
        ) : null}
      </div>
    </div>
  );
}
