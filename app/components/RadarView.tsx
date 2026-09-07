"use client";

/* eslint-disable @next/next/no-img-element -- Remote radar rasters must stay pixel-aligned over the live map. */

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronUp,
  CloudRain,
  Layers3,
  Map,
  Pause,
  Play,
  RefreshCw,
  ThermometerSun,
} from "lucide-react";
import { RadarMap } from "./RadarMap";
import type { Coordinates, RadarFrame, TemperatureImage } from "../lib/weather";
import {
  fetchRadarFrames,
  framesWithinHours,
  fetchTemperatureImage,
  formatTaipeiTime,
} from "../lib/weather";
import { BottomNavigation, type RootView } from "./BottomNavigation";

type Mode = "radar" | "temperature" | "rainfall";

const RADAR_TYPES = {
  radar: "taiwan_radar_reflectivity_transparent",
  shulin: "rainfall_radar_shulin",
  nantun: "rainfall_radar_nantun",
  linyuan: "rainfall_radar_linyuan",
} as const;

type Props = { coordinates: Coordinates; onNavigate: (view: RootView) => void };

export function RadarView({ onNavigate, coordinates }: Props) {
  const [revision, setRevision] = useState(0);
  const [mode, setMode] = useState<Mode>("radar");
  const [rainfallType, setRainfallType] = useState<"shulin" | "nantun" | "linyuan">("shulin");
  const [duration, setDuration] = useState(1);
  const [framesByType, setFramesByType] = useState<Record<string, RadarFrame[]>>({});
  const [temperatureImage, setTemperatureImage] = useState<TemperatureImage | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeType = mode === "rainfall" ? RADAR_TYPES[rainfallType] : RADAR_TYPES.radar;
  const allFrames = useMemo(
    () => framesByType[activeType] ?? [],
    [activeType, framesByType],
  );
  const frames = useMemo(
    () => framesWithinHours(allFrames, duration),
    [allFrames, duration],
  );
  const safeIndex = Math.min(selectedIndex, Math.max(0, frames.length - 1));
  const currentFrame = frames[safeIndex];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    const work = mode === "temperature"
      ? fetchTemperatureImage(controller.signal).then(image => setTemperatureImage(image))
      : fetchRadarFrames(activeType, 73, controller.signal).then(nextFrames => {
          if (controller.signal.aborted) return;
          setFramesByType(previous => ({ ...previous, [activeType]: nextFrames }));
          setSelectedIndex(10000);
        });
    work.catch(() => {
      if (!controller.signal.aborted) setError("圖資暫時無法載入，請稍後重新整理。");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeType, mode, revision]);

  useEffect(() => {
    if (!playing || mode === "temperature" || frames.length < 2) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((index) => (index + 1) % frames.length);
    }, 850);
    return () => window.clearInterval(timer);
  }, [playing, frames.length, mode]);

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setPlaying(false);
    setLayersOpen(false);
    const nextType = nextMode === "rainfall" ? RADAR_TYPES[rainfallType] : RADAR_TYPES.radar;
    const nextFrames = framesByType[nextType] ?? [];
    setSelectedIndex(Math.max(0, framesWithinHours(nextFrames, duration).length - 1));
  }

  function chooseDuration(hours: number) {
    setDuration(hours);
    setPlaying(false);
    setSelectedIndex(Math.max(0, framesWithinHours(allFrames, hours).length - 1));
  }

  function chooseRainfallType(nextType: "shulin" | "nantun" | "linyuan") {
    setRainfallType(nextType);
    setPlaying(false);
    setSelectedIndex(10000);
  }

  return (
    <main className="radar-screen">
      <div className={`map-canvas map-mode-${mode}`}>
        {mode === "radar" ? <RadarMap imageUrl={currentFrame?.r2Url || currentFrame?.url} coordinates={coordinates} /> : mode === "temperature" && temperatureImage ? (
          <img className="standalone-weather-image" src={temperatureImage.r2Url || temperatureImage.url || ""} alt="全台即時溫度分布圖" />
        ) : mode === "rainfall" && currentFrame ? (
          <img className="standalone-weather-image" src={currentFrame.r2Url || currentFrame.url} alt={`${formatTaipeiTime(currentFrame.dateTime)} 降雨雷達影像`} />
        ) : null}
      </div>

      <div className="map-brand">
        <span>台灣即時圖資</span>
        <strong>{mode === "radar" ? "雷達回波" : mode === "rainfall" ? "降雨雷達" : "溫度分布"}</strong>
      </div>

      <button
        type="button"
        className="map-layer-button"
        onClick={() => setLayersOpen((open) => !open)}
        aria-expanded={layersOpen}
        aria-label="切換圖層"
      >
        {layersOpen ? <ChevronUp /> : <Layers3 />}
      </button>

      {layersOpen ? (
        <div className="layer-menu">
          <button type="button" onClick={() => chooseMode("radar")}><Map /><span>雷達回波</span>{mode === "radar" ? <Check /> : null}</button>
          <button type="button" onClick={() => chooseMode("rainfall")}><CloudRain /><span>降雨雷達</span>{mode === "rainfall" ? <Check /> : null}</button>
          <button type="button" onClick={() => chooseMode("temperature")}><ThermometerSun /><span>溫度分布</span>{mode === "temperature" ? <Check /> : null}</button>
        </div>
      ) : null}

      <section className="radar-controls">
        <button type="button" className="radar-refresh" aria-label="重新整理圖資" disabled={loading} onClick={() => { setPlaying(false); setRevision(r => r + 1); }}><RefreshCw size={16} className={loading ? "spin" : ""} /></button>
        <h1>{mode === "radar" ? "雷達回波" : mode === "rainfall" ? "降雨雷達" : "溫度分布"}</h1>
        {mode === "rainfall" ? (
          <div className="segmented-control rainfall-stations">
            <button type="button" className={rainfallType === "shulin" ? "active" : ""} onClick={() => chooseRainfallType("shulin")}>樹林</button>
            <button type="button" className={rainfallType === "nantun" ? "active" : ""} onClick={() => chooseRainfallType("nantun")}>南屯</button>
            <button type="button" className={rainfallType === "linyuan" ? "active" : ""} onClick={() => chooseRainfallType("linyuan")}>林園</button>
          </div>
        ) : null}
        {mode !== "temperature" ? (
          <>
            <div className="segmented-control radar-duration">
              {[1, 3, 6, 12].map((hours) => (
                <button type="button" key={hours} className={duration === hours ? "active" : ""} onClick={() => chooseDuration(hours)}>{hours}小時</button>
              ))}
            </div>

            {loading ? (
              <div className="radar-loading"><RefreshCw className="spin" /> 載入雷達資料中…</div>
            ) : error ? (
              <div className="radar-loading">{error}<button type="button" onClick={() => setRevision(r => r + 1)}>重新整理</button></div>
            ) : (
              <>
                <div className="radar-time-row"><span>{frames[0] ? formatTaipeiTime(frames[0].dateTime) : "--"}</span><strong>{currentFrame ? formatTaipeiTime(currentFrame.dateTime) : "--"}</strong><span>{frames.at(-1) ? formatTaipeiTime(frames.at(-1)?.dateTime) : "--"}</span></div>
                <input
                  aria-label="雷達影格"
                  type="range"
                  min="0"
                  max={Math.max(0, frames.length - 1)}
                  value={safeIndex}
                  onChange={(event) => { setPlaying(false); setSelectedIndex(Number(event.target.value)); }}
                />
                <div className="playback-row">
                  <button type="button" className="play-button" onClick={() => setPlaying((value) => !value)} disabled={frames.length < 2} aria-label={playing ? "暫停" : "播放"}>
                    {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                  </button>
                  <div><span>{playing ? "播放中" : "已暫停"} · 過去 {duration} 小時</span><small>第 {frames.length ? safeIndex + 1 : 0} / {frames.length} 張 · 依觀測時間</small></div>
                  <button type="button" className="jump-button" onClick={() => { setSelectedIndex(Math.max(0, frames.length - 1)); setPlaying(false); }}>跳到現在</button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="temperature-panel-copy">{error ? <span role="status">{error}</span> : null}
            <strong>{temperatureImage ? formatTaipeiTime(temperatureImage.dateTime, true) : "--"}</strong>
            <span>顏色越偏紅代表溫度越高，綠色區域相對涼爽。</span>
          </div>
        )}
      </section>

      <BottomNavigation active="radar" onNavigate={onNavigate} />
    </main>
  );
}
