import { useEffect, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck, ShieldAlert, Wallet, Car, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DriverRideFlow } from "@/components/driver/ride-flow";

type DriverRow = {
  verification_status: "pending" | "verified_digital" | "verified_physical" | "suspended";
  badge_type: "verified" | "physically_verified" | null;
  plate_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_colour: string | null;
  bank_name: string | null;
  account_number: string | null;
  total_cash_debt: number;
  suspension_reason: string | null;
};

export function DriverHome() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(
          "verification_status, badge_type, plate_number, vehicle_make, vehicle_model, vehicle_colour, bank_name, account_number, total_cash_debt, suspension_reason"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        // First time driver — create shell row
        await supabase.from("drivers").insert({ user_id: user.id });
        setDriver({
          verification_status: "pending",
          badge_type: null,
          plate_number: null,
          vehicle_make: null,
          vehicle_model: null,
          vehicle_colour: null,
          bank_name: null,
          account_number: null,
          total_cash_debt: 0,
          suspension_reason: null,
        });
      } else {
        setDriver(data as DriverRow);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <DashboardShell title="Driver">
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  if (!driver) return null;

  if (driver.verification_status === "suspended") {
    return (
      <DashboardShell title="Account suspended">
        <Card className="border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-6 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Your account is suspended</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {driver.suspension_reason ??
                  "Please contact Hamduk Drive support to resolve this."}
              </p>
            </div>
          </div>
        </Card>
      </DashboardShell>
    );
  }

  if (driver.verification_status === "pending") {
    return (
      <DashboardShell
        title="Verification pending"
        subtitle="Our team will review your details shortly."
      >
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-warning/15 text-warning-foreground">
              <ShieldAlert className="size-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Awaiting verification</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                For the MVP, drivers are onboarded in person at LASU axis. Once verified, you'll
                see incoming rides here and in the WhatsApp dispatch group.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Need to update your details? Driver onboarding form ships in Phase 2.
              </p>
            </div>
          </div>
        </Card>
      </DashboardShell>
    );
  }

  // Verified
  const debtLocked = driver.total_cash_debt > 0;
  return (
    <DashboardShell
      title="Driver dashboard"
      subtitle="You're verified and ready to accept rides."
      badge={
        <Badge className="bg-success/15 text-success hover:bg-success/15">
          <ShieldCheck className="mr-1 size-3" />
          {driver.badge_type === "physically_verified"
            ? "Physically Verified"
            : "Verified"}
        </Badge>
      }
    >
      {debtLocked && (
        <Card className="mb-5 border-warning/40 bg-warning/5 p-5">
          <div className="flex items-start gap-3">
            <Wallet className="size-5 text-warning" />
            <div>
              <p className="font-semibold">
                Outstanding cash debt: ₦{driver.total_cash_debt.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Settle before 7:00 AM tomorrow to avoid being locked out from new rides.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Today's earnings</p>
          <p className="mt-2 text-3xl font-bold">₦0</p>
          <p className="mt-1 text-xs text-muted-foreground">No trips yet</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">This week</p>
          <p className="mt-2 text-3xl font-bold">₦0</p>
          <p className="mt-1 text-xs text-muted-foreground">0 completed rides</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Cash debt</p>
          <p className="mt-2 text-3xl font-bold">
            ₦{driver.total_cash_debt.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {debtLocked ? "Settle before 7am" : "All clear"}
          </p>
        </Card>
      </div>

      <div className="mt-5">
        <DriverRideFlow />
      </div>

      <Card className="mt-5 p-6">
        <div className="flex items-start gap-3">
          <Car className="size-5 text-primary" />
          <div className="flex-1">
            <h3 className="font-semibold">Vehicle</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {driver.vehicle_make
                ? `${driver.vehicle_colour ?? ""} ${driver.vehicle_make} ${driver.vehicle_model ?? ""} · ${driver.plate_number ?? "—"}`
                : "Vehicle details not yet recorded."}
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            Edit
          </Button>
        </div>
      </Card>
    </DashboardShell>
  );
}
