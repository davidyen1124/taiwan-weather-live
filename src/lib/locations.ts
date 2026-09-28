import cityDistrictsSource from "../data/cityDistricts.json";
import mountainLocationsSource from "../data/mountainLocations.json";
import type { Coordinates } from "./api";

type CitySource = { id: string; name: string; districts: Array<{ id: string; name: string; latitude: number; longitude: number }> };
type MountainSource = { id: string; name: string; city: string; latitude: number; longitude: number };

export type LocationKind = "current" | "district" | "mountain";

export type SavedLocation = {
  id: string;
  kind: LocationKind;
  name: string;
  city: string;
  coordinates: Coordinates | null;
};

export const CURRENT_LOCATION: SavedLocation = { id: "current", kind: "current", name: "目前位置", city: "", coordinates: null };

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
  if (v.kind === "current") return true;
  return (v.kind === "district" || v.kind === "mountain")
    && typeof v.coordinates?.latitude === "number" && typeof v.coordinates.longitude === "number";
}
