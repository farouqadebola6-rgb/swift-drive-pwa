// Geo helpers — Nominatim (geocoding) + OSRM (routing). Public endpoints.
// Search is unrestricted — users can find any place worldwide. A light
// "Lagos, Nigeria" suffix is appended only when the query has no commas
// (i.e. looks like a short local query) so common Lagos searches still rank
// well without blocking far-away queries.

export interface GeoPlace {
  display_name: string;
  lat: number;
  lng: number;
  area: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";

function deriveArea(addr?: Record<string, string>): string {
  if (!addr) return "";
  return (
    addr.suburb ||
    addr.neighbourhood ||
    addr.city_district ||
    addr.town ||
    addr.city ||
    addr.village ||
    addr.county ||
    addr.state ||
    addr.country ||
    ""
  );
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "10");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");

  const res = await fetch(url.toString(), {
    signal,
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }>;
  return data.map((d) => ({
    display_name: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    area: deriveArea(d.address) || "Unknown",
  }));
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeoPlace | null> {
  const url = new URL(`${NOMINATIM}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), {
    signal,
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return null;
  const d = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  if (!d?.display_name) return null;
  return {
    display_name: d.display_name,
    lat,
    lng,
    area: deriveArea(d.address) || "Current location",
  };
}

export interface RouteResult {
  distance_km: number;
  duration_min: number;
  geometry: Array<[number, number]>;
}

export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<RouteResult | null> {
  const url = `${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) return null;
  const coords: Array<[number, number]> = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng],
  );
  return {
    distance_km: route.distance / 1000,
    duration_min: route.duration / 60,
    geometry: coords,
  };
}

export interface PricingConfig {
  base_fare: number;
  per_km_rate: number;
  per_minute_rate: number;
  commission_percent: number;
}

export function estimateFare(
  distance_km: number,
  duration_min: number,
  cfg: PricingConfig,
): number {
  const raw = cfg.base_fare + distance_km * cfg.per_km_rate + duration_min * cfg.per_minute_rate;
  return Math.ceil(raw / 50) * 50;
}
