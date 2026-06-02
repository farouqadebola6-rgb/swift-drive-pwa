import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "./dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Settings2,
  Users,
  Car,
  Banknote,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Search,
  Wallet,
} from "lucide-react";
import { STATUS_LABEL, STATUS_TONE, naira } from "@/lib/ride-flow";

type Pricing = {
  base_fare: number;
  per_km_rate: number;
  per_minute_rate: number;
  commission_percent: number;
};

type DriverRow = {
  user_id: string;
  verification_status:
    | "pending"
    | "verified_digital"
    | "verified_physical"
    | "suspended";
  badge_type: "verified" | "physically_verified" | null;
  plate_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_colour: string | null;
  vehicle_year: number | null;
  vehicle_registration_number: string | null;
  bank_name: string | null;
  account_number: string | null;
  total_cash_debt: number;
  suspension_reason: string | null;
  created_at: string;
  date_of_birth: string | null;
  home_address: string | null;
  nin: string | null;
  drivers_license_number: string | null;
  drivers_license_expiry: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  profile_photo_url: string | null;
  vehicle_photo_url: string | null;
  licence_url: string | null;
  insurance_doc_url: string | null;
  vehicle_registration_doc_url: string | null;
  onboarding_submitted_at: string | null;
  paystack_subaccount_code: string | null;
  profile?: { full_name: string | null; phone: string | null } | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
};

type RideRow = {
  id: number;
  status: string;
  payment_method: string;
  pickup_area: string;
  destination_area: string;
  fare_estimate: number;
  final_fare: number | null;
  created_at: string;
  rider_id: string;
  driver_id: string | null;
};

type DebtRow = {
  id: string;
  ride_id: number;
  driver_id: string;
  amount_owed: number;
  settled: boolean;
  settled_at: string | null;
  created_at: string;
};

export function AdminHome() {
  return (
    <DashboardShell
      title="Admin console"
      subtitle="Manage drivers, riders, rides, and platform earnings."
    >
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="rides">Rides</TabsTrigger>
          <TabsTrigger value="debts">Debts</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="drivers" className="mt-4">
          <DriversTab />
        </TabsContent>
        <TabsContent value="rides" className="mt-4">
          <RidesTab />
        </TabsContent>
        <TabsContent value="debts" className="mt-4">
          <DebtsTab />
        </TabsContent>
        <TabsContent value="pricing" className="mt-4">
          <PricingTab />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

/* ------------------------------- Overview -------------------------------- */

function OverviewTab() {
  const [counts, setCounts] = useState<{
    riders: number;
    drivers: number;
    rides: number;
    pendingDrivers: number;
    activeRides: number;
    revenue: number;
    debt: number;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: roles }, { data: rides }, { data: drivers }, { data: debts }] =
        await Promise.all([
          supabase.from("user_roles").select("role"),
          supabase.from("rides").select("status, final_fare"),
          supabase.from("drivers").select("verification_status, total_cash_debt"),
          supabase.from("cash_debts").select("amount_owed, settled"),
        ]);
      const riders = roles?.filter((r) => r.role === "rider").length ?? 0;
      const driverCount = roles?.filter((r) => r.role === "driver").length ?? 0;
      const pendingDrivers =
        drivers?.filter((d) => d.verification_status === "pending").length ?? 0;
      const activeRides =
        rides?.filter((r) =>
          ["pending", "in_progress", "driver_arrived", "started"].includes(r.status),
        ).length ?? 0;
      const revenue =
        rides?.reduce(
          (acc, r) => acc + (r.status === "completed" ? Number(r.final_fare ?? 0) : 0),
          0,
        ) ?? 0;
      const debt =
        debts?.reduce(
          (acc, d) => acc + (!d.settled ? Number(d.amount_owed) : 0),
          0,
        ) ?? 0;
      setCounts({
        riders,
        drivers: driverCount,
        rides: rides?.length ?? 0,
        pendingDrivers,
        activeRides,
        revenue,
        debt,
      });
    })();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        icon={<Users className="size-5" />}
        label="Riders"
        value={counts?.riders}
      />
      <StatCard
        icon={<Car className="size-5" />}
        label="Drivers"
        value={counts?.drivers}
        sub={
          counts && counts.pendingDrivers > 0
            ? `${counts.pendingDrivers} awaiting verification`
            : undefined
        }
      />
      <StatCard
        icon={<Banknote className="size-5" />}
        label="Total rides"
        value={counts?.rides}
        sub={
          counts && counts.activeRides > 0
            ? `${counts.activeRides} active`
            : undefined
        }
      />
      <StatCard
        icon={<Banknote className="size-5" />}
        label="Completed revenue"
        value={counts ? naira(counts.revenue) : undefined}
      />
      <StatCard
        icon={<Wallet className="size-5" />}
        label="Outstanding cash debt"
        value={counts ? naira(counts.debt) : undefined}
      />
    </div>
  );
}

/* -------------------------------- Drivers -------------------------------- */

function DriversTab() {
  const [drivers, setDrivers] = useState<DriverRow[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DriverRow | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data ?? []) as DriverRow[];
    // Fetch profiles
    const ids = list.map((d) => d.user_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", ids);
      const map = new Map(profs?.map((p) => [p.id, p]) ?? []);
      list.forEach((d) => {
        d.profile = (map.get(d.user_id) as DriverRow["profile"]) ?? null;
      });
    }
    setDrivers(list);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = (drivers ?? []).filter((d) => {
    if (filter !== "all" && d.verification_status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = d.profile?.full_name?.toLowerCase() ?? "";
      const phone = d.profile?.phone ?? "";
      const plate = d.plate_number?.toLowerCase() ?? "";
      if (!name.includes(q) && !phone.includes(q) && !plate.includes(q))
        return false;
    }
    return true;
  });

  const exportCsv = () => {
    const rows = visible.map((d) => ({
      full_name: d.profile?.full_name ?? "",
      phone: d.profile?.phone ?? "",
      verification_status: d.verification_status,
      badge: d.badge_type ?? "",
      date_of_birth: d.date_of_birth ?? "",
      nin: d.nin ?? "",
      home_address: d.home_address ?? "",
      licence_number: d.drivers_license_number ?? "",
      licence_expiry: d.drivers_license_expiry ?? "",
      emergency_name: d.emergency_contact_name ?? "",
      emergency_phone: d.emergency_contact_phone ?? "",
      vehicle: `${d.vehicle_colour ?? ""} ${d.vehicle_make ?? ""} ${d.vehicle_model ?? ""}`.trim(),
      vehicle_year: d.vehicle_year ?? "",
      plate_number: d.plate_number ?? "",
      vehicle_registration_number: d.vehicle_registration_number ?? "",
      bank: d.bank_name ?? "",
      account_number: d.account_number ?? "",
      cash_debt: d.total_cash_debt,
      onboarding_submitted_at: d.onboarding_submitted_at ?? "",
      created_at: d.created_at,
    }));
    if (!rows.length) {
      toast.error("No drivers to export");
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escape((r as Record<string, unknown>)[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drivers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, or plate"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified_digital">Verified (digital)</SelectItem>
            <SelectItem value="verified_physical">Verified (physical)</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {!drivers ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No drivers match.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Debt</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((d) => (
                <TableRow key={d.user_id}>
                  <TableCell>
                    <p className="font-medium">{d.profile?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.profile?.phone ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.vehicle_make ? (
                      <>
                        <p>
                          {d.vehicle_colour} {d.vehicle_make} {d.vehicle_model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.plate_number}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <VerificationBadge status={d.verification_status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.total_cash_debt > 0 ? (
                      <span className="font-medium text-warning">
                        {naira(d.total_cash_debt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">₦0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(d)}
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing && (
        <DriverManageDialog
          driver={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </Card>
  );
}

function DriverManageDialog({
  driver,
  onClose,
  onSaved,
}: {
  driver: DriverRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(driver.verification_status);
  const [badge, setBadge] = useState<DriverRow["badge_type"]>(
    driver.badge_type ?? "verified",
  );
  const [reason, setReason] = useState(driver.suspension_reason ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const badgeValue: DriverRow["badge_type"] =
      status === "verified_physical"
        ? "physically_verified"
        : status === "verified_digital"
          ? (badge ?? "verified")
          : null;
    const patch = {
      verification_status: status,
      suspension_reason:
        status === "suspended" ? reason || "Suspended by admin" : null,
      badge_type: badgeValue,
    };
    const { error } = await supabase
      .from("drivers")
      .update(patch)
      .eq("user_id", driver.user_id);
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    // Auto-create Paystack subaccount when transitioning to verified
    const becameVerified =
      driver.verification_status !== status &&
      (status === "verified_digital" || status === "verified_physical");
    if (becameVerified && !driver.paystack_subaccount_code && driver.bank_name && driver.account_number) {
      try {
        const { createDriverSubaccount } = await import("@/lib/paystack.functions");
        const res = await createDriverSubaccount({ data: { driverId: driver.user_id } });
        toast.success(`Driver verified. Paystack subaccount ${res.already ? "linked" : "created"}: ${res.code}`);
      } catch (e) {
        toast.warning(
          `Driver verified, but Paystack subaccount failed: ${e instanceof Error ? e.message : "unknown"}. Use the button below to retry.`,
        );
      }
    } else {
      toast.success("Driver updated.");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{driver.profile?.full_name ?? "Driver"}</DialogTitle>
          <DialogDescription>
            {driver.profile?.phone ?? "—"} ·{" "}
            {driver.plate_number ?? "No plate on file"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Verification status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified_digital">Verified (digital)</SelectItem>
                <SelectItem value="verified_physical">Verified (physical)</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === "verified_digital" || status === "verified_physical") && (
            <div className="space-y-1.5">
              <Label>Badge</Label>
              <Select
                value={badge ?? "verified"}
                onValueChange={(v) => setBadge(v as DriverRow["badge_type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="physically_verified">
                    Physically Verified
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {status === "suspended" && (
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason shown to driver"
                rows={3}
              />
            </div>
          )}

          <DriverDetailsBlock driver={driver} />
        </div>

        <DialogFooter className="mt-2 flex-wrap gap-2 sm:justify-between">
          <SubaccountButton driver={driver} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DriverDetailsBlock({ driver }: { driver: DriverRow }) {
  const openDoc = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage
      .from("driver-documents")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-3 border-b border-border/50 py-1 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v || "—"}</span>
    </div>
  );

  const docs: { label: string; path: string | null }[] = [
    { label: "Profile photo", path: driver.profile_photo_url },
    { label: "Driver's licence", path: driver.licence_url },
    { label: "Vehicle photo", path: driver.vehicle_photo_url },
    { label: "Vehicle registration", path: driver.vehicle_registration_doc_url },
    { label: "Insurance", path: driver.insurance_doc_url },
  ];

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-xs">
      <div>
        <p className="mb-1 font-semibold text-foreground">Personal</p>
        <Row k="Date of birth" v={driver.date_of_birth} />
        <Row k="NIN" v={driver.nin} />
        <Row k="Home address" v={driver.home_address} />
      </div>
      <div>
        <p className="mb-1 font-semibold text-foreground">Licence</p>
        <Row k="Number" v={driver.drivers_license_number} />
        <Row k="Expiry" v={driver.drivers_license_expiry} />
      </div>
      <div>
        <p className="mb-1 font-semibold text-foreground">Emergency contact</p>
        <Row k="Name" v={driver.emergency_contact_name} />
        <Row k="Phone" v={driver.emergency_contact_phone} />
      </div>
      <div>
        <p className="mb-1 font-semibold text-foreground">Vehicle</p>
        <Row
          k="Make / Model"
          v={`${driver.vehicle_colour ?? ""} ${driver.vehicle_make ?? ""} ${driver.vehicle_model ?? ""}`.trim()}
        />
        <Row k="Year" v={driver.vehicle_year} />
        <Row k="Plate" v={driver.plate_number} />
        <Row k="Registration #" v={driver.vehicle_registration_number} />
      </div>
      <div>
        <p className="mb-1 font-semibold text-foreground">Payout</p>
        <Row k="Bank" v={driver.bank_name} />
        <Row k="Account" v={driver.account_number} />
        <Row k="Cash debt" v={naira(driver.total_cash_debt)} />
      </div>
      <div>
        <p className="mb-1 font-semibold text-foreground">Documents</p>
        <div className="flex flex-wrap gap-2">
          {docs.map((d) => (
            <Button
              key={d.label}
              size="sm"
              variant={d.path ? "outline" : "ghost"}
              disabled={!d.path}
              onClick={() => void openDoc(d.path)}
            >
              {d.label}
              {!d.path && " (none)"}
            </Button>
          ))}
        </div>
      </div>
      <p className="pt-1 text-muted-foreground">
        Submitted:{" "}
        {driver.onboarding_submitted_at
          ? new Date(driver.onboarding_submitted_at).toLocaleString()
          : "Not yet submitted"}
      </p>
    </div>
  );
}

function VerificationBadge({
  status,
}: {
  status: DriverRow["verification_status"];
}) {
  if (status === "pending")
    return (
      <Badge variant="outline" className="gap-1">
        <ShieldAlert className="size-3" /> Pending
      </Badge>
    );
  if (status === "suspended")
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldX className="size-3" /> Suspended
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-success/15 text-success hover:bg-success/15">
      <ShieldCheck className="size-3" />
      {status === "verified_physical" ? "Physical" : "Digital"}
    </Badge>
  );
}

/* --------------------------------- Rides --------------------------------- */

function RidesTab() {
  const [rides, setRides] = useState<RideRow[] | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(
          "id, status, payment_method, pickup_area, destination_area, fare_estimate, final_fare, created_at, rider_id, driver_id",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) toast.error(error.message);
      setRides((data ?? []) as RideRow[]);
    })();
  }, []);

  const visible = (rides ?? []).filter(
    (r) => filter === "all" || r.status === filter,
  );

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Last 100 rides {rides ? `(${visible.length})` : ""}
        </p>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">Accepted</SelectItem>
            <SelectItem value="driver_arrived">Driver arrived</SelectItem>
            <SelectItem value="started">Started</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!rides ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No rides match.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pay</TableHead>
                <TableHead className="text-right">Fare</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                  <TableCell className="text-sm">
                    {r.pickup_area} → {r.destination_area}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? ""}>
                      {STATUS_LABEL[r.status as keyof typeof STATUS_LABEL] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs uppercase">
                    {r.payment_method}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {naira(Number(r.final_fare ?? r.fare_estimate))}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

/* --------------------------------- Debts --------------------------------- */

function DebtsTab() {
  const [debts, setDebts] = useState<DebtRow[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("cash_debts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data ?? []) as DebtRow[];
    setDebts(list);
    const ids = Array.from(new Set(list.map((d) => d.driver_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      setNames(new Map(profs?.map((p) => [p.id, p.full_name ?? "—"]) ?? []));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settle = async (id: string) => {
    const ref = window.prompt("Settlement reference (e.g. transfer note)");
    if (ref === null) return;
    const { error } = await supabase
      .from("cash_debts")
      .update({
        settled: true,
        settled_at: new Date().toISOString(),
        settlement_reference: ref || "manual",
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Debt marked settled.");
    void load();
  };

  return (
    <Card className="p-4">
      {!debts ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : debts.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No cash debts recorded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Ride</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">
                    {names.get(d.driver_id) ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">#{d.ride_id}</TableCell>
                  <TableCell>{naira(Number(d.amount_owed))}</TableCell>
                  <TableCell>
                    {d.settled ? (
                      <Badge className="bg-success/15 text-success hover:bg-success/15">
                        Settled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning">
                        Outstanding
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {!d.settled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void settle(d.id)}
                      >
                        Mark settled
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

/* -------------------------------- Pricing -------------------------------- */

function PricingTab() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("pricing_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (data) setPricing(data as Pricing);
    })();
  }, []);

  const save = async () => {
    if (!pricing) return;
    setSaving(true);
    const { error } = await supabase
      .from("pricing_config")
      .update({ ...pricing, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Pricing updated.");
  };

  return (
    <Card className="p-6">
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
          <Button className="mt-5" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save pricing
          </Button>
        </>
      )}
    </Card>
  );
}

/* -------------------------------- Helpers -------------------------------- */

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | undefined;
  sub?: string;
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
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
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


function SubaccountButton({ driver }: { driver: DriverRow & { user_id?: string } }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      const { createDriverSubaccount } = await import("@/lib/paystack.functions");
      const res = await createDriverSubaccount({
        data: { driverId: (driver as unknown as { user_id: string }).user_id },
      });
      toast.success(
        res.already
          ? `Subaccount already linked: ${res.code}`
          : `Subaccount created: ${res.code}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  const hasCode = !!(driver as unknown as { paystack_subaccount_code?: string })
    .paystack_subaccount_code;
  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={busy}>
      {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
      {hasCode ? "Refresh Paystack subaccount" : "Create Paystack subaccount"}
    </Button>
  );
}
