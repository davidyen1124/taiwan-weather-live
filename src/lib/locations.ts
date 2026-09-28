import cityDistrictsSource from "../data/cityDistricts.json";
import mountainLocationsSource from "../data/mountainLocations.json";
import type { Coordinates } from "./api";

type CitySource = { id: string; name: string; districts: Array<{ id: string; name: string; latitude: number; longitude: number }> };
type MountainSource = { id: string; name: string; city: string; latitude: number; longitude: number };

export type LocationKind = "district" | "mountain";

export type SavedLocation = {
  id: string;
  kind: LocationKind;
  name: string;
  city: string;
  coordinates: Coordinates;
  /** Added with 定位目前位置 — shown with a location arrow. Coordinates are never re-requested. */
  located?: boolean;
};

export const CITIES = (cityDistrictsSource as CitySource[]).map((city) => ({
  name: city.name,
  districts: city.districts.map<SavedLocation>((d) => ({
    id: `district-${d.id}`, kind: "district", name: d.name, city: city.name,
    coordinates: { latitude: d.latitude, longitude: d.longitude },
  })),
}));

export const MOUNTAINS: SavedLocation[] = (mountainLocationsSource as MountainSource[]).map((m) => ({
  id: `mountain-${m.id}`, kind: "mountain", name: m.name, city: m.city,
  coordinates: { latitude: m.latitude, longitude: m.longitude },
}));

export const normalize = (text: string) => text.replaceAll("台", "臺").replace(/[\s,，、]/g, "");

export function isSavedLocation(value: unknown): value is SavedLocation {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedLocation;
  if (typeof v.id !== "string" || typeof v.name !== "string" || typeof v.city !== "string") return false;
  return (v.kind === "district" || v.kind === "mountain")
    && typeof v.coordinates?.latitude === "number" && typeof v.coordinates.longitude === "number";
}

const DISTRICTS = CITIES.flatMap((c) => c.districts);

/** The township closest to a GPS fix (haversine on the 368 CWA districts). */
export function nearestDistrict({ latitude, longitude }: Coordinates): SavedLocation {
  const rad = Math.PI / 180;
  const distance = (c: Coordinates) => {
    const dLat = (c.latitude - latitude) * rad, dLon = (c.longitude - longitude) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(latitude * rad) * Math.cos(c.latitude * rad) * Math.sin(dLon / 2) ** 2;
    return Math.asin(Math.sqrt(a));
  };
  return DISTRICTS.reduce((best, d) => (distance(d.coordinates) < distance(best.coordinates) ? d : best));
}
