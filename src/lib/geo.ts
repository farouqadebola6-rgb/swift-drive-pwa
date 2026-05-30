// Geo helpers — Nominatim (geocoding) + OSRM (routing). Public endpoints.
// Lagos viewbox biases search to greater Lagos.

export interface GeoPlace {
  display_name: string;
  lat: number;
  lng: number;
  area: string; // short locality (LGA / suburb)
}

const LAGOS_VIEWBOX = "2.7,6.8,4.4,6.3"; // lon_min,lat_max,lon_max,lat_min
const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("q", `${q}, Lagos, Nigeria`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ng");
  url.searchParams.set("viewbox", LAGOS_VIEWBOX);
  url.searchParams.set("bounded", "1");

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
    area:
      d.address?.suburb ||
      d.address?.neighbourhood ||
      d.address?.city_district ||
      d.address?.town ||
      d.address?.city ||
      d.address?.county ||
      "Lagos",
  }));
}

export interface RouteResult {
  distance_km: number;
  duration_min: number;
  geometry: Array<[number, number]>; // [lat, lng]
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
  // Round up to nearest 50 NGN
  return Math.ceil(raw / 50) * 50;
}
