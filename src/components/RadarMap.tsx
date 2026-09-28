
import { useEffect, useRef, useState } from "react";
import type { ImageOverlay, Map } from "leaflet";
import type { Coordinates } from "../lib/weather";

// CWA nearby-Taiwan composite product O-A0058: 118–124 E, 20.5–26.5 N.
// https://opendata.cwa.gov.tw/opendatadoc/MSC/A0058.pdf
const COMPOSITE_BOUNDS: [[number, number], [number, number]] = [[20.5, 118], [26.5, 124]];
export function RadarMap({ imageUrl, coordinates }: { imageUrl?: string; coordinates: Coordinates }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const overlay = useRef<ImageOverlay | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const initial = useRef(coordinates);
  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    import("leaflet").then(L => {
      if (cancelled || !container.current) return;
      const view = L.map(container.current, { center: [24.1, 121], zoom: 7, minZoom: 5, maxZoom: 12, zoomControl: true });
      map.current = view;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(view);
      const p = initial.current;
      L.circleMarker([p.latitude, p.longitude], { radius: 6, color: "#fff", weight: 2, fillColor: "#2c9bea", fillOpacity: 1 }).addTo(view).bindTooltip("目前預報位置");
      overlay.current = L.imageOverlay("", COMPOSITE_BOUNDS, { opacity: .82, interactive: false }).addTo(view);
      resize = new ResizeObserver(() => view.invalidateSize()); resize.observe(container.current);
      setReady(true);
    }).catch(() => setFailed(true));
    return () => { cancelled = true; resize?.disconnect(); map.current?.remove(); map.current = null; overlay.current = null; };
  }, []);
  useEffect(() => { if (ready && imageUrl) overlay.current?.setUrl(imageUrl); }, [ready, imageUrl]);
  return <><div className="geographic-radar-map" ref={container} aria-label="可縮放及拖曳的台灣雷達地圖" />{failed ? <p className="map-error" role="status">地圖暫時無法載入</p> : null}</>;
}
