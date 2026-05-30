import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "./dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Receipt, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BookingFlow } from "@/components/booking/booking-flow";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  in_progress: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
  driver_arrived: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
  started: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  cancelled: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200",
};

function naira(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export function RiderHome() {
  const { user } = useAuth();

  const { data: rides } = useQuery({
    queryKey: ["rides", "rider", user?.id],
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

  return (
    <DashboardShell
      title="Where to today?"
      subtitle="Book a ride or check your trip history."
    >
      <div className="grid gap-5 lg:grid-cols-[2fr,1fr]">
        <BookingFlow />

        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" /> Recent trips
          </div>
          {rides && rides.length > 0 ? (
            <div className="mt-4 space-y-3">
              {rides.map((r) => (
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
                      className={STATUS_TONE[r.status] ?? ""}
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
