import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getSharedTrip } from "@/lib/safety.functions";

export const Route = createFileRoute("/trip/$token")({
  head: () => ({
    meta: [
      { title: "Shared trip — Hamduk Drive" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedTripPage,
});

function SharedTripPage() {
  const { token } = Route.useParams();
  const fn = useServerFn(getSharedTrip);
  const { data, isLoading } = useQuery({
    queryKey: ["shared-trip", token],
    queryFn: () => fn({ data: { token } }),
    refetchInterval: 15_000,
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
          <p className="font-semibold">This trip link isn't valid anymore.</p>
        </Card>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="size-4 text-primary" /> Hamduk Drive — Trip share
        </div>
        <Card className="rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">Trip status</p>
          <p className="text-lg font-semibold capitalize">{String(data.status).replace("_", " ")}</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-primary" />
              <span>{data.pickup_address}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-accent" />
              <span>{data.destination_address}</span>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl p-5">
          <p className="text-xs text-muted-foreground">Rider</p>
          <p className="font-medium">{data.rider_name}</p>
          {data.driver_name && (
            <>
              <p className="mt-3 text-xs text-muted-foreground">Driver</p>
              <p className="font-medium">{data.driver_name}</p>
              {data.vehicle && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {[data.vehicle.colour, data.vehicle.make, data.vehicle.model]
                    .filter(Boolean)
                    .join(" ")}
                  {data.vehicle.plate ? ` · ${data.vehicle.plate}` : ""}
                </p>
              )}
            </>
          )}
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          This page updates automatically every 15 seconds.
        </p>
      </div>
    </div>
  );
}
