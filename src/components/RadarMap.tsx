import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, type ExpressionSpecification, type FilterSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Scheme } from "../lib/colors";

// CWA O-A0058-006 composite covers 118–124°E, 20.5–26.5°N.
const RADAR_NW: [number, number] = [118, 26.5];
const RADAR_SE: [number, number] = [124, 20.5];

// Same OpenFreeMap basemaps as mrt-app (no key, no usage limits), tuned below for a radar overlay.
const STYLE_URL: Record<Scheme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const ZH_NAME: ExpressionSpecification = ["coalesce", ["get", "name:zh-Hant"], ["get", "name:zh-TW"], ["get", "name:zh"], ["get", "name"]];

/**
 * Neutral grey land with a soft blue-grey sea so radar echoes stand out, Chinese labels,
 * no maritime borders or redundant country/state names, and small places only when zoomed in.
 */
function tune(map: MapLibreMap, scheme: Scheme) {
  const paint = (id: string, prop: string, value: unknown) => { if (map.getLayer(id)) map.setPaintProperty(id, prop, value); };
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    if (/^(label_country|label_state|place_country|place_state|boundary_disputed|highway[-_]name|highway-shield|road_shield|road_oneway|airport|waterway_line_label|water_name_line)/.test(id)) {
      map.setLayoutProperty(id, "visibility", "none");
      continue;
    }
    if (layer.type === "line" && id.startsWith("boundary")) {
      const existing = map.getFilter(id);
      map.setFilter(id, (existing ? ["all", existing, ["!=", ["get", "maritime"], 1]] : ["!=", ["get", "maritime"], 1]) as FilterSpecification);
    }
    if (layer.type === "symbol" && map.getLayoutProperty(id, "text-field")) {
      map.setLayoutProperty(id, "text-field", ZH_NAME);
      if (/(other|village|suburb)$/.test(id)) map.setLayerZoomRange(id, 11, 24);
      if (scheme === "dark" && /^place_/.test(id)) {
        paint(id, "text-color", "#c9ccd2");
        paint(id, "text-halo-color", "rgba(17, 18, 22, 0.9)");
      }
    }
  }
  if (scheme === "light") {
    paint("background", "background-color", "#f5f5f2");
    paint("water", "fill-color", "#c8d9e5");
    paint("waterway", "line-color", "#c8d9e5");
  } else {
    paint("background", "background-color", "#26282c");
    paint("water", "fill-color", "#121419");
    paint("waterway", "line-color", "#121419");
    paint("landuse_residential", "fill-color", "#2c2e33");
    // OpenFreeMap Dark's wood-pattern fill renders as a field of grey dots.
    if (map.getLayer("landcover_wood")) map.setLayoutProperty("landcover_wood", "visibility", "none");
    paint("highway_motorway_inner", "line-color", "#45484e");
    paint("highway_major_inner", "line-color", "#3a3d42");
    paint("highway_major_subtle", "line-color", "#3a3d42");
    paint("highway_motorway_subtle", "line-color", "#3a3d42");
    paint("highway_minor", "line-color", "#33363b");
  }
  // The app's map marks the Tropic of Cancer, which crosses Chiayi and Hualien.
  if (!map.getSource("tropic")) {
    map.addSource("tropic", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[100, 23.4365], [140, 23.4365]] } } });
  }
  if (!map.getLayer("tropic")) {
    const firstLabel = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;
    map.addLayer({
      id: "tropic", type: "line", source: "tropic",
      paint: { "line-color": scheme === "dark" ? "rgba(200, 210, 220, 0.35)" : "rgba(110, 110, 110, 0.45)", "line-width": 1, "line-dasharray": [3, 2.5] },
    }, firstLabel);
  }
}

export function RadarMap({ imageUrl, scheme }: { imageUrl?: string; scheme: Scheme }) {
  const holder = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLImageElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const schemeRef = useRef(scheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!holder.current) return;
    const m = new MapLibreMap({
      container: holder.current,
      style: STYLE_URL[schemeRef.current],
      center: [120.97, 23.5],
      zoom: 5.75,
      minZoom: 4,
      maxZoom: 12,
      attributionControl: false,
      localIdeographFontFamily: "'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
      dragRotate: false,
      pitchWithRotate: false,
      fadeDuration: 0,
    });
    m.touchZoomRotate.disableRotation();
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
    m.on("style.load", () => { tune(m, schemeRef.current); place(); setReady(true); });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (schemeRef.current === scheme) return;
    schemeRef.current = scheme;
    map.current?.setStyle(STYLE_URL[scheme]);
  }, [scheme]);

  return (
    <div className="radar-map" ref={holder}>
      <img ref={overlay} className="radar-overlay" src={imageUrl} alt="" hidden={!imageUrl || !ready} />
    </div>
  );
}
