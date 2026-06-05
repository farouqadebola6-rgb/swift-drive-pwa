import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, MapPin } from "lucide-react";
import { naira, STATUS_LABEL, STATUS_TONE, type RideStatus } from "@/lib/ride-flow";
import { PullToRefresh } from "@/components/pull-to-refresh";

export const Route = createFileRoute("/_authenticated/rides")({
  head: () => ({ meta: [{ title: "Your rides — Hamduk Drive" }] }),
  component: RidesPage,
});

function RidesPage() {
  const { user, role } = useAuth();
  const isDriver = role === "driver";

  const { data: rides = [], isLoading, refetch } = useQuery({
    queryKey: ["rides-history", user?.id, role],
    enabled: !!user,
    queryFn: async () => {
      const col = isDriver ? "driver_id" : "rider_id";
      const { data, error } = await supabase
        .from("rides")
        .select(
          "id, status, pickup_address, destination_address, fare_estimate, final_fare, payment_method, created_at",
        )
        .eq(col, user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <DashboardShell title="Rides" subtitle={isDriver ? "Trips you've driven." : "Your ride history."}>
      <PullToRefresh onRefresh={() => refetch()}>
      {isLoading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : rides.length === 0 ? (
        <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No rides yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {rides.map((r) => (
            <Card key={r.id} className="rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge className={STATUS_TONE[r.status as RideStatus]}>
                    {STATUS_LABEL[r.status as RideStatus]}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold">
                    {naira(r.final_fare ?? r.fare_estimate)}
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {r.payment_method}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-primary" />
                  <span className="truncate">{r.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-accent" />
                  <span className="truncate">{r.destination_address}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      </PullToRefresh>
    </DashboardShell>
  );
}
