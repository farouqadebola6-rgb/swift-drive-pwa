import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Banknote, CreditCard, Car, Clock, Route as RouteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  estimateFare,
  getRoute,
  type GeoPlace,
  type PricingConfig,
  type RouteResult,
} from "@/lib/geo";
import { cn } from "@/lib/utils";
import { LocationAutocomplete } from "./location-autocomplete";
import { RouteMap } from "./route-map";

function formatNaira(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function BookingFlow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pickup, setPickup] = useState<GeoPlace | null>(null);
  const [destination, setDestination] = useState<GeoPlace | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [method, setMethod] = useState<"online" | "cash">("cash");

  const { data: pricing } = useQuery({
    queryKey: ["pricing_config"],
    queryFn: async (): Promise<PricingConfig> => {
      const { data, error } = await supabase
        .from("pricing_config")
        .select("base_fare, per_km_rate, per_minute_rate, commission_percent")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          base_fare: 500,
          per_km_rate: 150,
          per_minute_rate: 30,
          commission_percent: 7,
        }
      );
    },
  });

  // Fetch route whenever both ends are set
  useEffect(() => {
    if (!pickup || !destination) {
      setRoute(null);
      return;
    }
    const ctrl = new AbortController();
    setRouting(true);
    getRoute(pickup, destination, ctrl.signal)
      .then((r) => {
        if (!r) {
          toast.error("Couldn't compute a route. Try different locations.");
        }
        setRoute(r);
      })
      .catch(() => {
        /* aborted */
      })
      .finally(() => setRouting(false));
    return () => ctrl.abort();
  }, [pickup, destination]);

  const fare =
    pricing && route ? estimateFare(route.distance_km, route.duration_min, pricing) : 0;

  const createRide = useMutation({
    mutationFn: async () => {
      if (!user || !pickup || !destination || !route || !pricing) {
        throw new Error("Missing booking details");
      }
      const { data, error } = await supabase
        .from("rides")
        .insert({
          rider_id: user.id,
          pickup_address: pickup.display_name,
          pickup_area: pickup.area,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          destination_address: destination.display_name,
          destination_area: destination.area,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          estimated_distance_km: Number(route.distance_km.toFixed(2)),
          estimated_duration_min: Number(route.duration_min.toFixed(1)),
          fare_estimate: fare,
          payment_method: method,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ride requested! Searching for a driver…");
      setPickup(null);
      setDestination(null);
      setRoute(null);
      void qc.invalidateQueries({ queryKey: ["rides"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canBook = !!pickup && !!destination && !!route && !routing;

  return (
    <Card className="overflow-hidden p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr,1fr]">
        <div className="space-y-4">
          <LocationAutocomplete
            label="Pickup"
            placeholder="Search pickup location"
            value={pickup}
            onChange={setPickup}
            iconClassName="text-primary"
          />
          <LocationAutocomplete
            label="Destination"
            placeholder="Where to?"
            value={destination}
            onChange={setDestination}
            iconClassName="text-accent"
          />

          {route && pricing && (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Fare estimate</div>
                  <div className="text-2xl font-bold tracking-tight">
                    {formatNaira(fare)}
                  </div>
                </div>
                <Car className="size-8 text-primary" />
              </div>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <RouteIcon className="size-3.5" />
                  {route.distance_km.toFixed(1)} km
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {Math.round(route.duration_min)} min
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              Payment method
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition",
                  method === "cash"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                <Banknote className="size-4" /> Cash
              </button>
              <button
                type="button"
                onClick={() => setMethod("online")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition",
                  method === "online"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                <CreditCard className="size-4" /> Online (Paystack)
              </button>
            </div>
            {method === "online" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Online payment activates in Phase 4 (Paystack). Use Cash for now.
              </p>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!canBook || createRide.isPending || method === "online"}
            onClick={() => createRide.mutate()}
          >
            {createRide.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Requesting…
              </>
            ) : routing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Calculating route…
              </>
            ) : (
              "Request ride"
            )}
          </Button>
        </div>

        <RouteMap pickup={pickup} destination={destination} route={route} />
      </div>
    </Card>
  );
}
