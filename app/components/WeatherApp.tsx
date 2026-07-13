"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates, WeatherBundle } from "../lib/weather";
import { DEFAULT_COORDS, fetchWeatherBundle } from "../lib/weather";
import { DetailSheets } from "./DetailSheets";
import { RadarView } from "./RadarView";
import { WeatherHome, type SheetName } from "./WeatherHome";

export function WeatherApp() {
  const [data, setData] = useState<WeatherBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [view, setView] = useState<"home" | "radar">("home");
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
    loadWeather(DEFAULT_COORDS);
    return () => requestRef.current?.abort();
  }, [loadWeather]);

  useEffect(() => {
    document.body.style.overflow = sheet || view === "radar" ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheet, view]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("此瀏覽器不支援定位，已顯示臺北市大安區。");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        loadWeather({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => {
        setLocating(false);
        setError("未取得定位權限，已繼續顯示臺北市大安區。");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, [loadWeather]);

  const openRadar = useCallback(() => {
    setSheet(null);
    setView("radar");
  }, []);

  const openSheet = useCallback((nextSheet: SheetName) => {
    setSheet(nextSheet);
  }, []);

  return (
    <div className="app-stage">
      <div className="phone-app">
        {view === "radar" ? (
          <RadarView onHome={() => setView("home")} />
        ) : (
          <WeatherHome
            data={data}
            loading={loading}
            error={error}
            locating={locating}
            onLocate={locate}
            onRefresh={() => loadWeather(coords)}
            onOpenSheet={openSheet}
            onOpenRadar={openRadar}
          />
        )}
        {view === "home" && data ? (
          <DetailSheets
            active={sheet}
            data={data}
            onClose={() => setSheet(null)}
            onOpenRadar={openRadar}
            onNavigate={openSheet}
          />
        ) : null}
      </div>
    </div>
  );
}
