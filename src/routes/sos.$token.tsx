import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Siren, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSharedSos } from "@/lib/safety.functions";

export const Route = createFileRoute("/sos/$token")({
  head: () => ({
    meta: [
      { title: "SOS — live tracking — Hamduk Drive" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SosPage,
});

function fmtAgo(iso?: string | null) {
  if (!iso) return "no update yet";
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  return `${Math.round(sec / 3600)} h ago`;
}

function SosPage() {
  const { token } = Route.useParams();
  const fn = useServerFn(getSharedSos);
  const { data, isLoading } = useQuery({
    queryKey: ["shared-sos", token],
    queryFn: () => fn({ data: { token } }),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 p-6">
        <Card className="rounded-2xl p-6 text-center">
          <p className="font-semibold">This SOS link is no longer valid.</p>
        </Card>
      </div>
    );
  }

  const isActive = data.status === "active";
  const mapsUrl =
    data.last_lat != null && data.last_lng != null
      ? `https://maps.google.com/?q=${data.last_lat},${data.last_lng}`
      : null;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <div
          className={
            "rounded-2xl p-5 text-center " +
            (isActive
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-foreground")
          }
        >
          <Siren className="mx-auto size-8" />
          <p className="mt-2 text-lg font-bold">
            {isActive ? "SOS ACTIVE" : "SOS resolved"}
          </p>
          <p className="text-xs opacity-90">
            {isActive
              ? "Location refreshes every few minutes."
              : `Stopped ${fmtAgo(data.stopped_at)}.`}
          </p>
        </div>

        <Card className="rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">From</p>
          <p className="text-lg font-semibold">{data.user_name}</p>
          {data.user_phone && (
            <a
              href={`tel:${data.user_phone}`}
              className="mt-2 inline-flex items-center gap-2 text-sm text-primary"
            >
              <Phone className="size-4" /> Call {data.user_phone}
            </a>
          )}
        </Card>

        <Card className="rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">Last known location</p>
          {mapsUrl ? (
            <>
              <p className="mt-1 text-sm font-medium">
                {data.last_lat?.toFixed(5)}, {data.last_lng?.toFixed(5)}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated {fmtAgo(data.last_ping_at)}
              </p>
              <Button asChild className="mt-3 h-11 w-full rounded-full">
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <MapPin className="mr-2 size-4" /> Open in Google Maps
                </a>
              </Button>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No location shared yet. Try again in a minute.
            </p>
          )}
        </Card>

        {data.ride && (
          <Card className="rounded-2xl p-5">
            <p className="text-xs text-muted-foreground">Trip</p>
            <p className="text-sm capitalize">{String(data.ride.status).replace("_", " ")}</p>
            <div className="mt-2 space-y-1 text-sm">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-primary" />
                {data.ride.pickup_address}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-accent" />
                {data.ride.destination_address}
              </p>
            </div>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          This page auto-refreshes every 30 seconds. If something looks wrong,
          please dial 112.
        </p>
      </div>
    </div>
  );
}
