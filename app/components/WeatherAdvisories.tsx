"use client";

import {
  AlertTriangle,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  fetchWeatherAdvisories,
  formatTaipeiTime,
  type WeatherAdvisory,
} from "../lib/weather";
import { BottomNavigation, type RootView } from "./BottomNavigation";

function advisoryColor(advisory: WeatherAdvisory) {
  const values = advisory.websiteColor
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter(Number.isFinite)
    .slice(0, 3);
  return values.length === 3
    ? `rgb(${values.join(" ")})`
    : advisory.type === "rain"
      ? "#2ca5ed"
      : "#ff9841";
}

export function WeatherAdvisories({
  onNavigate,
}: {
  onNavigate: (view: RootView) => void;
}) {
  const [advisories, setAdvisories] = useState<WeatherAdvisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchWeatherAdvisories(controller.signal)
      .then((items) => {
        setAdvisories(items);
        setError(false);
      })
      .catch((nextError: unknown) => {
        if ((nextError as Error)?.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return controller;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchWeatherAdvisories(controller.signal)
      .then((items) => {
        setAdvisories(items);
        setError(false);
      })
      .catch((nextError: unknown) => {
        if ((nextError as Error)?.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="advisory-screen">
      <header className="root-screen-header">
        <h1>天氣警特報</h1>
        <button
          type="button"
          aria-label="重新整理警特報"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={19} className={loading ? "spin" : ""} />
        </button>
      </header>

      <div className="advisory-screen-scroll">
        {loading ? (
          <div className="sheet-loading-state">
            <RefreshCw className="spin" />
            <span>正在取得最新警特報…</span>
          </div>
        ) : error ? (
          <div className="advisory-empty-state error">
            <AlertTriangle size={35} />
            <strong>警特報暫時無法載入</strong>
            <span>請稍後再試一次。</span>
            <button type="button" onClick={refresh}>重新整理</button>
          </div>
        ) : advisories.length ? (
          <div className="advisory-list">
            {advisories.map((advisory) => (
              <article
                key={advisory.id}
                className={`advisory-card advisory-${advisory.type}`}
                style={
                  {
                    "--advisory-color": advisoryColor(advisory),
                  } as CSSProperties
                }
              >
                <header>
                  <span><AlertTriangle size={20} /></span>
                  <div>
                    <strong>{advisory.title}</strong>
                    <small>{advisory.severityLevel}</small>
                  </div>
                  <time>{formatTaipeiTime(advisory.effectiveAt, true)}</time>
                </header>
                <div className="advisory-areas">
                  {advisory.areas.map((area) => (
                    <span key={`${advisory.id}-${area.locationId}`}>{area.name}</span>
                  ))}
                </div>
                <p>{advisory.description}</p>
                <div className="advisory-instruction">
                  <strong>注意事項</strong>
                  <span>{advisory.instruction}</span>
                </div>
                <footer>
                  <span>
                    {advisory.senderName} · 至{" "}
                    {formatTaipeiTime(advisory.expiresAt, true)}
                  </span>
                  {advisory.webUrl ? (
                    <a href={advisory.webUrl} target="_blank" rel="noreferrer">
                      官方資訊 <ExternalLink size={15} />
                    </a>
                  ) : null}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="advisory-empty-state">
            <Check size={36} />
            <strong>目前沒有生效中的警特報</strong>
            <span>天氣平穩，仍建議出門前查看最新預報。</span>
          </div>
        )}
      </div>

      <BottomNavigation active="advisories" onNavigate={onNavigate} />
    </main>
  );
}
