import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { ShieldCheck, PhoneCall, Share2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/safety")({
  head: () => ({ meta: [{ title: "Safety — Hamduk Drive" }] }),
  component: SafetyPage,
});

const tips = [
  { icon: ShieldCheck, title: "Verified drivers only", body: "Every Hamduk driver is digitally or physically verified before accepting rides." },
  { icon: Share2, title: "Share your trip", body: "Tap Share trip from an active ride to send a live link to a trusted contact." },
  { icon: PhoneCall, title: "Emergency", body: "In an emergency, call 112 (Lagos) immediately, then contact Hamduk support." },
  { icon: AlertTriangle, title: "Report an incident", body: "Use the Support page to report any safety concern. We respond within 24 hours." },
];

function SafetyPage() {
  return (
    <DashboardShell title="Safety" subtitle="Your safety is the whole point.">
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
