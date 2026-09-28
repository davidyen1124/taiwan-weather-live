import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchLeaderboardNow, fetchRadarFrames, fetchTemperatureImage, fetchTemperatureTop100,
  type LeaderboardEntry, type RadarFrame, type TemperatureImage, type TemperatureRanking,
} from "../lib/api";
import { hhmm } from "../lib/format";
import { useStore } from "../state";
import { RadarMap } from "./RadarMap";
import { Segmented, Symbol } from "./ui";

type Layer = "radar" | "rain" | "temperature";
type Station = "shulin" | "nantun" | "linyuan";
const RADAR_TYPE = "taiwan_radar_reflectivity_transparent";
const STATIONS: Array<{ value: Station; label: string }> = [
  { value: "shulin", label: "樹林" }, { value: "nantun", label: "南屯" }, { value: "linyuan", label: "林園" },
];
const DURATIONS = [1, 3, 6, 12] as const;

export function MapsScreen() {
  const [layer, setLayer] = useState<Layer>("radar");
  const [menu, setMenu] = useState(false);
  return (
    <main className={`maps maps-${layer}`}>
      {layer === "radar" ? <RadarLayer /> : layer === "rain" ? <RainLayer /> : <TemperatureLayer />}
      <button type="button" className="glass-circle layer-button" aria-label="切換圖層" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
        <Symbol name={layer === "radar" ? "map" : layer === "rain" ? "cloudRain" : "thermometer"} size={26} strokeWidth={1.6} />
      </button>
      {menu ? (
        <>
          <div className="menu-dismiss" onClick={() => setMenu(false)} />
          <div className="layer-menu" role="menu">
            {([["radar", "雷達回波"], ["rain", "降雨雷達"], ["temperature", "溫度"]] as const).map(([value, label]) => (
              <button key={value} type="button" role="menuitemradio" aria-checked={layer === value} onClick={() => { setLayer(value); setMenu(false); }}>
                <span className="check">{layer === value ? "✓" : ""}</span>{label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}

function useFrames(type: string) {
  const [frames, setFrames] = useState<RadarFrame[] | null>(null);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setFrames(null); setError(false); setProgress(null);
    fetchRadarFrames(type, type === RADAR_TYPE ? 73 : 100, controller.signal)
      .then(async (list) => {
        if (type !== RADAR_TYPE) {
          // Station rasters are full images: preload the last hour like the app's "下載雷達影像中... n/25".
          const recent = list.slice(-25);
          let done = 0;
          setProgress([0, recent.length]);
          await Promise.all(recent.map((f) => new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => { done += 1; if (!controller.signal.aborted) setProgress([done, recent.length]); resolve(); };
            img.src = f.r2Url || f.url;
          })));
        }
        if (!controller.signal.aborted) setFrames(list);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [type]);
  return { frames, error, progress };
}

function usePlayback({ title, frames, stationPicker }: { title: string; frames: RadarFrame[]; stationPicker?: React.ReactNode }) {
  const [hours, setHours] = useState<(typeof DURATIONS)[number]>(1);
  const windowFrames = useMemo(() => {
    const last = frames.at(-1);
    if (!last) return [];
    const start = new Date(last.dateTime).getTime() - hours * 3600000;
    return frames.filter((f) => new Date(f.dateTime).getTime() >= start);
  }, [frames, hours]);
  const [index, setIndex] = useState(Number.MAX_SAFE_INTEGER);
  const [playing, setPlaying] = useState(false);
  const safe = Math.min(index, windowFrames.length - 1);
  const frame = windowFrames[safe];

  useEffect(() => { setIndex(Number.MAX_SAFE_INTEGER); setPlaying(false); }, [hours, frames]);
  useEffect(() => {
    if (!playing || windowFrames.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (Math.min(i, windowFrames.length - 1) + 1) % windowFrames.length), 600);
    return () => clearInterval(timer);
  }, [playing, windowFrames.length]);

  return { frame, panel: (
    <div className="playback-panel">
      <h2>{title}</h2>
      {stationPicker}
      <Segmented className="panel-segmented" value={String(hours)} onChange={(v) => setHours(Number(v) as (typeof DURATIONS)[number])}
        items={DURATIONS.map((h) => ({ value: String(h), label: `${h}小時` }))} />
      <div className="playback-times">
        <span>{hhmm(windowFrames[0]?.dateTime)}</span>
        <strong>{hhmm(frame?.dateTime)}</strong>
        <span>{hhmm(windowFrames.at(-1)?.dateTime)}</span>
      </div>
      <input className="playback-slider" type="range" min={0} max={Math.max(0, windowFrames.length - 1)} value={Math.max(0, safe)}
        style={{ ["--fill" as string]: `${windowFrames.length > 1 ? (safe / (windowFrames.length - 1)) * 100 : 100}%` }}
        onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)); }} aria-label="時間" />
      <div className="playback-controls">
        <button type="button" className={`play-button ${playing ? "playing" : ""}`} aria-label={playing ? "pause" : "play"} onClick={() => setPlaying((p) => !p)} disabled={windowFrames.length < 2}>
          <Symbol name={playing ? "pause" : "play"} size={28} />
        </button>
        <div className="playback-status">
          <span>{playing ? "播放中" : "已暫停"} · 過去 {hours} 小時</span>
          <span>第 {windowFrames.length ? safe + 1 : "--"} / {windowFrames.length || "--"} 張 · 每 10 分鐘</span>
        </div>
        <button type="button" className="jump-now" onClick={() => { setPlaying(false); setIndex(Number.MAX_SAFE_INTEGER); }}>跳到現在</button>
      </div>
    </div>
  ) };
}

/** Sits just above the panel, so it follows whatever height the panel ends up. */
function MapCredit() {
  return <a className="map-credit" href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap <span>© OpenMapTiles © OpenStreetMap</span></a>;
}

function PanelShell({ children, tone }: { children: React.ReactNode; tone: "sky" | "plain" }) {
  return <div className={`maps-panel ${tone}`}>{children}</div>;
}

function LoadingPanel({ text, progress, tone }: { text: string; progress?: [number, number] | null; tone: "sky" | "plain" }) {
  return (
    <PanelShell tone={tone}>
      <div className="panel-loading">
        <span className="spinner small" />
        <strong>{text}</strong>
        {progress ? <span>{progress[0]}/{progress[1]}</span> : null}
      </div>
    </PanelShell>
  );
}

function RadarLayer() {
  const { scheme } = useStore();
  const { frames, error } = useFrames(RADAR_TYPE);
  const playback = usePlayback({ title: "雷達回波", frames: frames ?? [] });
  const url = playback.frame ? playback.frame.r2Url || playback.frame.url : undefined;
  return (
    <>
      <RadarMap imageUrl={url} scheme={scheme} />
      {error ? <LoadingPanel tone="sky" text="雷達影像載入失敗" /> : !frames ? <LoadingPanel tone="sky" text="載入雷達資料中..." /> : frames.length === 0 ? <LoadingPanel tone="sky" text="目前沒有雷達影像" /> : <PanelShell tone="sky"><MapCredit />{playback.panel}</PanelShell>}
    </>
  );
}

function RainLayer() {
  const [station, setStation] = useState<Station>("shulin");
  const { frames, error, progress } = useFrames(`rainfall_radar_${station}`);
  const picker = <Segmented className="panel-segmented station" value={station} onChange={setStation} items={STATIONS} />;
  const playback = usePlayback({ title: "降雨雷達", frames: frames ?? [], stationPicker: picker });
  const frame = playback.frame;
  return (
    <>
      <div className="raster-view rain-raster">
        {frame ? <ZoomImage src={frame.r2Url || frame.url} alt={`${hhmm(frame.dateTime)} 降雨雷達`} /> : null}
      </div>
      {error ? <LoadingPanel tone="plain" text="雷達影像載入失敗" />
        : !frames ? <LoadingPanel tone="plain" text={progress ? "下載雷達影像中..." : "載入雷達資料中..."} progress={progress} />
        : frames.length === 0 ? <LoadingPanel tone="plain" text="尚無雷達影像" /> : <PanelShell tone="plain">{playback.panel}</PanelShell>}
    </>
  );
}

function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [t, setT] = useState({ x: 0, y: 0, s: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; d: number } | null>(null);
  const update = () => {
    const pts = [...pointers.current.values()];
    if (!pts.length) { last.current = null; return; }
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const d = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    if (last.current) {
      const prev = last.current;
      setT((v) => {
        const s = pts.length > 1 && prev.d ? Math.min(5, Math.max(1, v.s * (d / prev.d))) : v.s;
        return { x: v.x + cx - prev.x, y: v.y + cy - prev.y, s };
      });
    }
    last.current = { x: cx, y: cy, d };
  };
  return (
    <div className="zoom-image"
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); last.current = null; update(); }}
      onPointerMove={(e) => { if (!pointers.current.has(e.pointerId)) return; pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); update(); }}
      onPointerUp={(e) => { pointers.current.delete(e.pointerId); last.current = null; update(); }}
      onPointerCancel={(e) => { pointers.current.delete(e.pointerId); last.current = null; }}
      onWheel={(e) => setT((v) => ({ ...v, s: Math.min(5, Math.max(1, v.s * (e.deltaY < 0 ? 1.1 : 0.9))) }))}
      onDoubleClick={() => setT({ x: 0, y: 0, s: 1 })}>
      <img src={src} alt={alt} draggable={false} style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }} />
    </div>
  );
}

function TemperatureLayer() {
  const [image, setImage] = useState<TemperatureImage | null>(null);
  const [mode, setMode] = useState<"top100" | "live">("top100");
  const [top100, setTop100] = useState<TemperatureRanking[] | null>(null);
  const [live, setLive] = useState<LeaderboardEntry[] | null>(null);
  const [failed, setFailed] = useState({ top100: false, live: false });
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);

  useEffect(() => {
    const c = new AbortController();
    fetchTemperatureImage(c.signal).then(setImage).catch(() => {});
    fetchTemperatureTop100(c.signal).then(setTop100).catch(() => setFailed((f) => ({ ...f, top100: true })));
    fetchLeaderboardNow(c.signal).then(setLive).catch(() => setFailed((f) => ({ ...f, live: true })));
    return () => c.abort();
  }, []);

  const rows = mode === "top100"
    ? top100?.map((r) => ({ key: r.stationName + r.rank, rank: r.rank, name: r.stationName, sub: `於 ${r.observedAt} 測得`, temp: r.temperatureC }))
    : live?.map((r) => ({ key: r.locationId, rank: r.rank, name: r.displayLocationName, sub: `體感 ${Math.round(r.feelsLike)}°`, temp: r.temperature }));
  const empty = mode === "top100" ? (failed.top100 ? "無法取得高溫排行資料" : "目前沒有高溫排行資料") : (failed.live ? "無法取得即時排行資料" : "目前沒有即時排行資料");

  const share = async () => {
    const lines = (rows ?? []).slice(0, 5).map((r) => `#${r.rank} ${r.name} ${r.temp.toFixed(1)}°`);
    const text = `有多熱全國排行（${mode === "top100" ? "今日前 100" : "即時排行"}）\n${lines.join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ title: "有多熱全國排行", text, url: location.href });
      else await navigator.clipboard.writeText(`${text}\n${location.href}`);
    } catch { /* cancelled */ }
  };

  return (
    <>
      <div className="raster-view temperature-raster">
        {image ? <ZoomImage src={image.r2Url || image.url || ""} alt="溫度分布圖" /> : null}
      </div>
      <div className={`ranking-sheet ${expanded ? "expanded" : ""}`}>
        <div className="grabber-zone"
          onPointerDown={(e) => { drag.current = { y: e.clientY, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (drag.current && Math.abs(e.clientY - drag.current.y) > 24) { setExpanded(e.clientY < drag.current.y); drag.current.moved = true; } }}
          onPointerUp={() => { if (drag.current && !drag.current.moved) setExpanded((x) => !x); drag.current = null; }}>
          <span className="grabber" />
        </div>
        <div className="ranking-head">
          <span className="glass-circle-spacer" />
          <h2>有多熱全國排行</h2>
          <button type="button" className="glass-circle small" aria-label="Share" onClick={share}><Symbol name="share" size={22} strokeWidth={1.6} /></button>
        </div>
        <Segmented className="ranking-segmented" value={mode} onChange={setMode} items={[{ value: "top100", label: "今日前 100" }, { value: "live", label: "即時排行" }]} />
        <div className="ranking-list">
          {!rows ? <div className="ranking-state"><span className="spinner" /></div>
            : rows.length === 0 ? <div className="ranking-state">{empty}</div>
            : rows.map((r) => (
              <div className="ranking-row" key={r.key}>
                <span className="ranking-rank">#{r.rank}</span>
                <span className="ranking-name"><strong>{r.name}</strong><small>{r.sub}</small></span>
                <span className="ranking-temp">{r.temp.toFixed(1)}°</span>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
