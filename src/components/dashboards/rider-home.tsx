import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "./dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Receipt, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BookingFlow } from "@/components/booking/booking-flow";
import { RiderActiveRide } from "@/components/rider/active-ride";
import { STATUS_TONE, naira, type RideStatus } from "@/lib/ride-flow";

const ACTIVE_STATUSES: RideStatus[] = [
  "pending",
  "in_progress",
  "driver_arrived",
  "started",
];

export function RiderHome() {
  const { user } = useAuth();

  const { data: active, isLoading } = useQuery({
    queryKey: ["activeRide", "rider", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(
          "id, status, pickup_address, destination_address, fare_estimate, final_fare, driver_id, payment_method, created_at",
        )
        .eq("rider_id", user!.id)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Also include the most-recent completed ride if it hasn't been rated yet
  const { data: pendingRating } = useQuery({
    queryKey: ["pendingRating", user?.id],
    enabled: !!user && !active,
    queryFn: async () => {
      const { data: completed } = await supabase
        .from("rides")
        .select(
          "id, status, pickup_address, destination_address, fare_estimate, final_fare, driver_id, payment_method, created_at",
        )
        .eq("rider_id", user!.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!completed) return null;
      const { data: rating } = await supabase
        .from("ratings")
        .select("id")
        .eq("ride_id", completed.id)
        .maybeSingle();
      return rating ? null : completed;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["rides", "rider", "history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(
          "id, status, pickup_area, destination_area, fare_estimate, final_fare, created_at",
        )
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const showCard = active ?? pendingRating;

  return (
    <DashboardShell
      title={active ? "Your ride" : "Where to today?"}
      subtitle={
        active
          ? "We'll keep this updated as your driver progresses."
          : "Book a ride or check your trip history."
      }
    >
      <div className="grid gap-5 lg:grid-cols-[2fr,1fr]">
        {isLoading ? (
          <Card className="grid place-items-center p-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </Card>
        ) : showCard ? (
          <RiderActiveRide ride={showCard} />
        ) : (
          <BookingFlow />
        )}

        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" /> Recent trips
          </div>
          {history && history.length > 0 ? (
            <div className="mt-4 space-y-3">
              {history.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        <span className="truncate">
                          {r.pickup_area} → {r.destination_area}
                        </span>
                      </div>
                      <div className="mt-1 font-medium">
                        {naira(r.final_fare ?? r.fare_estimate)}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={STATUS_TONE[r.status as RideStatus] ?? ""}
                    >
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center py-10 text-center">
              <Receipt className="size-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">
                No rides yet. Your trip history will appear here.
              </p>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
