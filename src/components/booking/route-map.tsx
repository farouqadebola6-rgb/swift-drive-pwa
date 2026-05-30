import { useEffect, useState } from "react";
import type { RouteResult } from "@/lib/geo";

interface Props {
  pickup: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  route: RouteResult | null;
}

// Leaflet must only run on the client (uses window/document at import time).
export function RouteMap(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="grid h-72 w-full place-items-center rounded-lg border border-border bg-muted text-xs text-muted-foreground">
        Loading map…
      </div>
    );
  }
  return <LeafletMap {...props} />;
}

function LeafletMap({ pickup, destination, route }: Props) {
  // Dynamic require inside client-only render
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet") as typeof import("leaflet");
  const {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    useMap,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
  } = require("react-leaflet") as typeof import("react-leaflet");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("leaflet/dist/leaflet.css");

  // Fix default icons (Vite asset URLs)
  const icon = L.icon({
    iconUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const center: [number, number] = pickup
    ? [pickup.lat, pickup.lng]
    : [6.5244, 3.3792]; // Lagos

  function FitBounds() {
    const map = useMap();
    useEffect(() => {
      if (route?.geometry?.length) {
        map.fitBounds(route.geometry as [number, number][], { padding: [40, 40] });
      } else if (pickup && destination) {
        map.fitBounds(
          [
            [pickup.lat, pickup.lng],
            [destination.lat, destination.lng],
          ],
          { padding: [40, 40] },
        );
      } else if (pickup) {
        map.setView([pickup.lat, pickup.lng], 14);
      }
    }, [map]);
    return null;
  }

  return (
    <div className="h-72 w-full overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={icon} />}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={icon} />
        )}
        {route?.geometry && (
          <Polyline
            positions={route.geometry}
            pathOptions={{ color: "#0b3d2e", weight: 5, opacity: 0.85 }}
          />
        )}
        <FitBounds />
      </MapContainer>
    </div>
  );
}
