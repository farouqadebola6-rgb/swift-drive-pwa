import { DashboardShell } from "./dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Clock, Receipt } from "lucide-react";

export function RiderHome() {
  return (
    <DashboardShell
      title="Where to today?"
      subtitle="Book a ride or check your trip history."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="col-span-2 p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <MapPin className="size-5 text-primary" />
              <input
                disabled
                placeholder="Pickup location (coming next phase)"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <MapPin className="size-5 text-accent" />
              <input
                disabled
                placeholder="Where to?"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Button className="w-full" size="lg" disabled>
              Get fare estimate
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Booking flow ships in Phase 2 (maps + Paystack).
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" /> Recent trips
          </div>
          <div className="mt-4 flex flex-col items-center justify-center py-10 text-center">
            <Receipt className="size-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm text-muted-foreground">
              No rides yet. Your trip history will appear here.
            </p>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
