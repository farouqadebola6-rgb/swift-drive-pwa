import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, MapPin, Banknote, CreditCard, Navigation, CheckCircle2, Play,
  XCircle, Siren, Share2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  acceptRide, cancelRide, completeRide, markRideStatus, naira,
  STATUS_LABEL, STATUS_TONE, type RideStatus,
} from "@/lib/ride-flow";
import { triggerSos, shareTrip } from "@/lib/safety.functions";

function getPos(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

type PoolRide = {
  id: number;
  pickup_area: string;
  destination_area: string;
  pickup_address: string;
  destination_address: string;
  fare_estimate: number;
  estimated_distance_km: number | null;
  estimated_duration_min: number | null;
  payment_method: "online" | "cash";
  created_at: string;
};

type ActiveRide = PoolRide & {
  status: RideStatus;
  rider_id: string;
  actual_distance_km: number | null;
  actual_duration_min: number | null;
};

export function DriverRideFlow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sosFn = useServerFn(triggerSos);
  const shareFn = useServerFn(shareTrip);


  const active = useQuery({
    queryKey: ["driver", "activeRide", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async (): Promise<ActiveRide | null> => {
      const { data, error } = await supabase
        .from("rides")
        .select(
          "id, status, rider_id, pickup_area, destination_area, pickup_address, destination_address, fare_estimate, estimated_distance_km, estimated_duration_min, actual_distance_km, actual_duration_min, payment_method, created_at",
        )
        .eq("driver_id", user!.id)
        .in("status", ["in_progress", "driver_arrived", "started"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ActiveRide | null) ?? null;
    },
  });

  const pool = useQuery({
    queryKey: ["driver", "pool"],
    enabled: !!user && !active.data,
    refetchInterval: 5000,
    queryFn: async (): Promise<PoolRide[]> => {
      const { data, error } = await supabase
        .from("rides")
        .select(
          "id, pickup_area, destination_area, pickup_address, destination_address, fare_estimate, estimated_distance_km, estimated_duration_min, payment_method, created_at",
        )
        .eq("status", "pending")
        .is("driver_id", null)
        .order("created_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data as PoolRide[]) ?? [];
    },
  });

  const accept = useMutation({
    mutationFn: (id: number) => acceptRide(id),
    onSuccess: () => {
      toast.success("Ride accepted. Head to pickup.");
      void qc.invalidateQueries({ queryKey: ["driver"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeKey = ["driver", "activeRide", user?.id] as const;

  const advance = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: "driver_arrived" | "started";
    }) => markRideStatus(id, status),
    onMutate: async ({ status }) => {
      await qc.cancelQueries({ queryKey: activeKey });
      const prev = qc.getQueryData<ActiveRide | null>(activeKey);
      if (prev) qc.setQueryData<ActiveRide | null>(activeKey, { ...prev, status });
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(activeKey, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["driver"] }),
  });

  const finish = useMutation({
    mutationFn: ({
      id,
      distance,
      duration,
    }: {
      id: number;
      distance: number;
      duration: number;
    }) => completeRide(id, distance, duration),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: activeKey });
      const prev = qc.getQueryData<ActiveRide | null>(activeKey);
      qc.setQueryData<ActiveRide | null>(activeKey, null);
      return { prev };
    },
    onSuccess: () => toast.success("Trip completed."),
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(activeKey, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["driver"] }),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => cancelRide(id, "Cancelled by driver"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: activeKey });
      const prev = qc.getQueryData<ActiveRide | null>(activeKey);
      qc.setQueryData<ActiveRide | null>(activeKey, null);
      return { prev };
    },
    onSuccess: () => toast.message("Ride cancelled."),
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(activeKey, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["driver"] }),
  });

  if (active.isLoading) {
    return (
      <Card className="grid place-items-center p-10">
        <Loader2 className="size-5 animate-spin text-primary" />
      </Card>
    );
  }

  if (active.data) {
    const r = active.data;
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge className={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
            <h3 className="mt-2 text-lg font-semibold">Active ride #{r.id}</h3>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Fare estimate</div>
            <div className="text-xl font-bold">{naira(r.fare_estimate)}</div>
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              {r.payment_method === "cash" ? (
                <>
                  <Banknote className="size-3" /> Cash
                </>
              ) : (
                <>
                  <CreditCard className="size-3" /> Online
                </>
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-primary" />
            <span>{r.pickup_address}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 text-accent" />
            <span>{r.destination_address}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {r.status === "in_progress" && (
            <Button
              onClick={() => advance.mutate({ id: r.id, status: "driver_arrived" })}
              disabled={advance.isPending}
            >
              <Navigation className="mr-2 size-4" /> I've arrived
            </Button>
          )}
          {r.status === "driver_arrived" && (
            <Button
              onClick={() => advance.mutate({ id: r.id, status: "started" })}
              disabled={advance.isPending}
            >
              <Play className="mr-2 size-4" /> Start trip
            </Button>
          )}
          {r.status === "started" && (
            <Button
              onClick={() =>
                finish.mutate({
                  id: r.id,
                  distance: Number(r.estimated_distance_km ?? 0),
                  duration: Number(r.estimated_duration_min ?? 0),
                })
              }
              disabled={finish.isPending}
            >
              <CheckCircle2 className="mr-2 size-4" /> Complete trip
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Cancel this ride?")) cancel.mutate(r.id);
            }}
            disabled={cancel.isPending}
          >
            <XCircle className="mr-2 size-4" /> Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Available rides</h3>
        <span className="text-xs text-muted-foreground">
          {pool.isFetching ? "Refreshing…" : "Auto-refresh 5s"}
        </span>
      </div>

      {pool.data && pool.data.length > 0 ? (
        <div className="space-y-3">
          {pool.data.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-border p-4 transition hover:border-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="size-3.5 text-primary" />
                    <span className="truncate">{r.pickup_area}</span>
                    <span className="text-muted-foreground">→</span>
                    <MapPin className="size-3.5 text-accent" />
                    <span className="truncate">{r.destination_area}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {r.pickup_address}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{Number(r.estimated_distance_km ?? 0).toFixed(1)} km</span>
                    <span>{Math.round(Number(r.estimated_duration_min ?? 0))} min</span>
                    <span className="inline-flex items-center gap-1">
                      {r.payment_method === "cash" ? (
                        <Banknote className="size-3" />
                      ) : (
                        <CreditCard className="size-3" />
                      )}
                      {r.payment_method}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{naira(r.fare_estimate)}</div>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => accept.mutate(r.id)}
                    disabled={accept.isPending}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No rides in the pool. New requests will appear here automatically.
        </p>
      )}
    </Card>
  );
}
