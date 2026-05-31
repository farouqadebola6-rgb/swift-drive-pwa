import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "./dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck, ShieldAlert, Wallet, Car, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DriverRideFlow } from "@/components/driver/ride-flow";
import { DriverOnboardingForm } from "@/components/driver/onboarding-form";

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
  onboarding_submitted_at: string | null;
  [key: string]: unknown;
};

export function DriverHome() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    let row = data as DriverRow | null;
    if (!row) {
      await supabase.from("drivers").insert({ user_id: user.id });
      const { data: again } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      row = (again as DriverRow | null) ?? null;
    }
    setDriver(row);

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(prof ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

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
    if (!driver.onboarding_submitted_at) {
      return (
        <DashboardShell
          title="Driver onboarding"
          subtitle="Complete your application to start accepting rides."
        >
          <DriverOnboardingForm
            initial={{
              ...driver,
              __full_name: profile?.full_name ?? "",
              __phone: profile?.phone ?? "",
            }}
            onSubmitted={() => void load()}
          />
        </DashboardShell>
      );
    }
    return (
      <DashboardShell
        title="Verification pending"
        subtitle="Our team will review your application shortly."
      >
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-warning/15">
              <ShieldAlert className="size-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Application submitted</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We received your documents on{" "}
                {new Date(driver.onboarding_submitted_at).toLocaleDateString()}.
                Reviews typically complete within 24 hours. You'll be notified once verified.
              </p>
            </div>
          </div>
        </Card>
      </DashboardShell>
    );
  }

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
        </div>
      </Card>
    </DashboardShell>
  );
}
