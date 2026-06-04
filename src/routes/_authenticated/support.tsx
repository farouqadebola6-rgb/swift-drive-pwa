import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Mail, MessageCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — Hamduk Drive" }] }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <DashboardShell title="Support" subtitle="We typically reply within 12 hours.">
      <div className="grid gap-3">
        <ContactCard icon={<Mail className="size-5" />} title="Email" href="mailto:support@hamdukdrive.com" value="support@hamdukdrive.com" />
        <ContactCard icon={<MessageCircle className="size-5" />} title="WhatsApp" href="https://wa.me/2348000000000" value="+234 800 000 0000" />
        <ContactCard icon={<Phone className="size-5" />} title="Safety hotline (24/7)" href="tel:+2348000000001" value="+234 800 000 0001" />
        <ContactCard icon={<Mail className="size-5" />} title="Driver onboarding" href="mailto:drivers@hamdukdrive.com" value="drivers@hamdukdrive.com" />
      </div>
    </DashboardShell>
  );
}

function ContactCard({ icon, title, href, value }: { icon: React.ReactNode; title: string; href: string; value: string }) {
  return (
    <Card className="rounded-2xl p-4">
      <a href={href} className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="truncate text-sm font-medium">{value}</p>
        </div>
      </a>
    </Card>
  );
}
