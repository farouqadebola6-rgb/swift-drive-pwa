import { useEffect, useState } from "react";
import { DashboardShell } from "./dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Settings2, Users, Car, Banknote } from "lucide-react";

type Pricing = {
  base_fare: number;
  per_km_rate: number;
  per_minute_rate: number;
  commission_percent: number;
};

export function AdminHome() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [counts, setCounts] = useState<{
    riders: number;
    drivers: number;
    rides: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: pc }, { count: rideCount }, { data: roles }] = await Promise.all([
        supabase.from("pricing_config").select("*").eq("id", 1).maybeSingle(),
        supabase.from("rides").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
      ]);
      if (pc) setPricing(pc as Pricing);
      const riders = roles?.filter((r) => r.role === "rider").length ?? 0;
      const drivers = roles?.filter((r) => r.role === "driver").length ?? 0;
      setCounts({ riders, drivers, rides: rideCount ?? 0 });
    })();
  }, []);

  const savePricing = async () => {
    if (!pricing) return;
    setSaving(true);
    const { error } = await supabase
      .from("pricing_config")
      .update({
        base_fare: pricing.base_fare,
        per_km_rate: pricing.per_km_rate,
        per_minute_rate: pricing.per_minute_rate,
        commission_percent: pricing.commission_percent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Pricing updated.");
  };

  return (
    <DashboardShell
      title="Admin"
      subtitle="Manage drivers, pricing, and platform earnings."
    >
      {/* Stat tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Users className="size-5" />} label="Riders" value={counts?.riders} />
        <StatCard icon={<Car className="size-5" />} label="Drivers" value={counts?.drivers} />
        <StatCard
          icon={<Banknote className="size-5" />}
          label="Total rides"
          value={counts?.rides}
        />
      </div>

      {/* Pricing config */}
      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="size-5 text-primary" />
          <h3 className="text-lg font-semibold">Pricing configuration</h3>
        </div>
        {!pricing ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <PriceField
                id="base"
                label="Base fare (₦)"
                value={pricing.base_fare}
                onChange={(v) => setPricing({ ...pricing, base_fare: v })}
              />
              <PriceField
                id="km"
                label="Per KM (₦)"
                value={pricing.per_km_rate}
                onChange={(v) => setPricing({ ...pricing, per_km_rate: v })}
              />
              <PriceField
                id="min"
                label="Per minute (₦)"
                value={pricing.per_minute_rate}
                onChange={(v) => setPricing({ ...pricing, per_minute_rate: v })}
              />
              <PriceField
                id="commission"
                label="Commission (%)"
                value={pricing.commission_percent}
                onChange={(v) => setPricing({ ...pricing, commission_percent: v })}
              />
            </div>
            <Button className="mt-5" onClick={savePricing} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save pricing
            </Button>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Driver management, dispatch logs, and earnings analytics ship next.
      </p>
    </DashboardShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold">{value ?? "—"}</p>
    </Card>
  );
}

function PriceField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}
