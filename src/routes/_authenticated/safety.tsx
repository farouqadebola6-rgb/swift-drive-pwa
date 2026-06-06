import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, PhoneCall, Share2, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/safety")({
  head: () => ({ meta: [{ title: "Safety — Hamduk Drive" }] }),
  component: SafetyPage,
});

const tips = [
  { icon: ShieldCheck, title: "Verified drivers only", body: "Every Hamduk driver is digitally or physically verified before accepting rides." },
  { icon: Share2, title: "Share your trip", body: "During an active ride, tap Share trip to send a live link to your emergency contact via WhatsApp." },
  { icon: PhoneCall, title: "SOS — 112", body: "During a ride, tap SOS to dial 112 and ping your emergency contact with your ride and location." },
  { icon: AlertTriangle, title: "Report an incident", body: "Use the Support page to file a safety report. We respond within 24 hours." },
];

function SafetyPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("emergency_contact_name, emergency_contact_phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as {
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
        } | null;
        setName(row?.emergency_contact_name ?? "");
        setPhone(row?.emergency_contact_phone ?? "");
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        emergency_contact_name: name || null,
        emergency_contact_phone: phone || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Emergency contact saved.");
  };

  return (
    <DashboardShell title="Safety" subtitle="Your safety is the whole point.">
      <Card className="mb-4 rounded-2xl p-5">
        <h3 className="font-semibold">Emergency contact</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          We'll WhatsApp this person if you trigger SOS or share a trip.
        </p>
        {loading ? (
          <div className="grid place-items-center py-6"><Loader2 className="size-5 animate-spin text-primary" /></div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-2xl bg-muted/50" placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">WhatsApp phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-2xl bg-muted/50" placeholder="+234..." />
            </div>
            <Button onClick={save} disabled={saving} className="h-11 w-full rounded-full">
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save contact
            </Button>
          </div>
        )}
      </Card>

      <div className="grid gap-3">
        {tips.map((t) => (
          <Card key={t.title} className="flex items-start gap-3 rounded-2xl p-4">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <t.icon className="size-5" />
            </div>
            <div>
              <p className="font-medium">{t.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
