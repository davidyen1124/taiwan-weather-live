import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Scheme } from "../lib/colors";

// CWA O-A0058-006 composite covers 118–124°E, 20.5–26.5°N.
const RADAR_NW: [number, number] = [118, 26.5];
const RADAR_SE: [number, number] = [124, 20.5];

/** Palette sampled from Apple Maps as rendered inside the iOS app. */
const PALETTE = {
  light: { land: "#f1f5e7", green: "#e4eed7", water: "#bfe4fa", waterDeep: "#9fd1f3", road: "#ffffff", roadCase: "#e2ddd0", border: "#b7b2a8", city: "#6f6f6f", cityHalo: "rgba(255,255,255,0.9)", country: "#a77d9c", sea: "#7c9fbd", reliefOpacity: 0.11, tropic: "rgba(110,110,110,0.55)" },
  dark: { land: "#203f49", green: "#1d4148", water: "#142350", waterDeep: "#0b1638", road: "#3c5660", roadCase: "#203f49", border: "#5e7b83", city: "#c9d3d8", cityHalo: "rgba(10,20,50,0.85)", country: "#c7a9c0", sea: "#8ea5c9", reliefOpacity: 0.1, tropic: "rgba(200,210,220,0.45)" },
};

function buildStyle(scheme: Scheme): StyleSpecification {
  const c = PALETTE[scheme];
  const name = ["coalesce", ["get", "name:zh-Hant"], ["get", "name:zh"], ["get", "name"]] as unknown as string;
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
      tropic: { type: "geojson", data: { type: "Feature", properties: { name: "北回歸線" }, geometry: { type: "LineString", coordinates: [[100, 23.4365], [140, 23.4365]] } } },
      relief: { type: "raster", tiles: ["https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 6 },
    },
    layers: [
      { id: "land", type: "background", paint: { "background-color": c.land } },
      { id: "relief", type: "raster", source: "relief", paint: { "raster-opacity": c.reliefOpacity, "raster-saturation": -0.6, "raster-fade-duration": 0 } },
      { id: "wood", type: "fill", source: "omt", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]], paint: { "fill-color": c.green, "fill-opacity": 0.55, "fill-antialias": false } },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": ["interpolate", ["linear"], ["zoom"], 4, c.waterDeep, 7, c.water] } },
      { id: "roads", type: "line", source: "omt", "source-layer": "transportation", minzoom: 6, filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk"]]], paint: { "line-color": c.road, "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 10, 2.4] } },
      { id: "boundary", type: "line", source: "omt", "source-layer": "boundary", filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]], minzoom: 7, paint: { "line-color": c.border, "line-width": 0.8, "line-dasharray": [2, 2] } },
      { id: "tropic", type: "line", source: "tropic", paint: { "line-color": c.tropic, "line-width": 1.1, "line-dasharray": [3, 2.5] } },
      { id: "sea-labels", type: "symbol", source: "omt", "source-layer": "water_name", layout: { "text-field": name, "text-font": ["Noto Sans Italic"], "text-size": 12, "text-letter-spacing": 0.3, "text-max-width": 6 }, paint: { "text-color": c.sea, "text-halo-color": c.cityHalo, "text-halo-width": 0.6 } },
      { id: "country", type: "symbol", source: "omt", "source-layer": "place", filter: ["==", ["get", "class"], "country"], layout: { "text-field": name, "text-font": ["Noto Sans Bold"], "text-size": 14, "text-letter-spacing": 0.15 }, paint: { "text-color": c.country, "text-halo-color": c.cityHalo, "text-halo-width": 1 } },
      { id: "cities", type: "symbol", source: "omt", "source-layer": "place", filter: ["all", ["==", ["get", "class"], "city"], ["<=", ["get", "rank"], 6]], layout: { "icon-image": `city-dot-${scheme}`, "icon-size": 0.5, "text-field": name, "text-font": ["Noto Sans Bold"], "text-size": 15, "text-anchor": "left", "text-offset": [0.7, 0], "text-optional": false }, paint: { "text-color": c.city, "text-halo-color": c.cityHalo, "text-halo-width": 1.4 } },
    ],
  };
}

export function RadarMap({ imageUrl, scheme }: { imageUrl?: string; scheme: Scheme }) {
  const holder = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLImageElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!holder.current) return;
    const m = new MapLibreMap({
      container: holder.current,
      style: buildStyle(scheme),
      center: [120.97, 23.5],
      zoom: 5.75,
      minZoom: 4,
      maxZoom: 11,
      attributionControl: false,
      localIdeographFontFamily: "'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.on("styleimagemissing", (e) => {
      if (!e.id.startsWith("city-dot-")) return;
      const c = PALETTE[e.id.endsWith("dark") ? "dark" : "light"];
      const size = 22, canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const g = canvas.getContext("2d")!;
      g.fillStyle = c.cityHalo; g.strokeStyle = c.city; g.lineWidth = 3.2;
      g.beginPath(); g.arc(size / 2, size / 2, 7, 0, Math.PI * 2); g.fill(); g.stroke();
      m.addImage(e.id, g.getImageData(0, 0, size, size), { pixelRatio: 1 });
    });
    // Radar frames come from a CDN without CORS headers, so they are drawn as a plain <img>
    // pinned to the composite's lat/lon bounds instead of a WebGL image source.
    const place = () => {
      const img = overlay.current;
      if (!img) return;
      const nw = m.project(RADAR_NW), se = m.project(RADAR_SE);
      img.style.transform = `translate(${nw.x}px, ${nw.y}px)`;
      img.style.width = `${se.x - nw.x}px`;
      img.style.height = `${se.y - nw.y}px`;
    };
    m.on("move", place);
    m.on("resize", place);
    m.on("load", () => { place(); setReady(true); });
    map.current = m;
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) map.current?.setStyle(buildStyle(scheme), { diff: true });
  }, [scheme, ready]);

  return (
    <div className="radar-map" ref={holder}>
      <img ref={overlay} className="radar-overlay" src={imageUrl} alt="" hidden={!imageUrl || !ready} />
      <a className="map-credit" href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap <span>© OpenMapTiles © OpenStreetMap</span></a>
    </div>
  );
}
