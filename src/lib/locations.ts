import cityDistrictsSource from "../data/cityDistricts.json";
import mountainLocationsSource from "../data/mountainLocations.json";
import type { Coordinates } from "./weather";

type CityDistrictSource = {
  id: string;
  name: string;
  districts: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }>;
};

type MountainLocationSource = {
  id: string;
  name: string;
  city: string;
  geocode: string;
  latitude: number;
  longitude: number;
};

export type LocationKind = "current" | "district" | "mountain";

export type SavedWeatherLocation = {
  id: string;
  name: string;
  city: string;
  kind: LocationKind;
  coordinates: Coordinates | null;
};

export type SearchableWeatherLocation = SavedWeatherLocation & {
  searchText: string;
};

export type SavedLocationsState = {
  version: 1;
  locations: SavedWeatherLocation[];
  selectedLocationId?: string;
};

const cityDistricts = cityDistrictsSource as CityDistrictSource[];
const mountainLocations = mountainLocationsSource as MountainLocationSource[];

export const CURRENT_LOCATION: SavedWeatherLocation = {
  id: "current-location",
  name: "目前位置",
  city: "使用裝置定位",
  kind: "current",
  coordinates: null,
};

export const DISTRICT_LOCATIONS: SearchableWeatherLocation[] =
  cityDistricts.flatMap((city) =>
    city.districts.map((district) => ({
      id: `district-${district.id}`,
      name: district.name,
      city: city.name,
      kind: "district" as const,
      coordinates: {
        latitude: district.latitude,
        longitude: district.longitude,
      },
      searchText: `${city.name}${district.name}`.replaceAll("臺", "台"),
    })),
  );

export const MOUNTAIN_LOCATIONS: SearchableWeatherLocation[] =
  mountainLocations.map((mountain) => ({
    id: `mountain-${mountain.id}`,
    name: mountain.name,
    city: mountain.city,
    kind: "mountain" as const,
    coordinates: {
      latitude: mountain.latitude,
      longitude: mountain.longitude,
    },
    searchText: `${mountain.name}${mountain.city}`.replaceAll("臺", "台"),
  }));

export const DEFAULT_SAVED_LOCATIONS: SavedWeatherLocation[] = [
  CURRENT_LOCATION,
];

export function locationDisplayName(location: SavedWeatherLocation) {
  if (location.kind === "current") return location.name;
  return `${location.city} ${location.name}`;
}

export function isSavedLocationsState(value: unknown): value is SavedLocationsState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedLocationsState>;
  if (candidate.version !== 1 || !Array.isArray(candidate.locations)) return false;
  if (
    candidate.selectedLocationId !== undefined &&
    typeof candidate.selectedLocationId !== "string"
  ) {
    return false;
  }
  return candidate.locations.every((location) => {
    if (!location || typeof location !== "object") return false;
    const item = location as Partial<SavedWeatherLocation>;
    if (
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.city !== "string" ||
      !["current", "district", "mountain"].includes(item.kind ?? "")
    ) {
      return false;
    }
    if (item.kind === "current") return item.coordinates === null;
    return (
      typeof item.coordinates?.latitude === "number" &&
      typeof item.coordinates.longitude === "number"
    );
  });
}
