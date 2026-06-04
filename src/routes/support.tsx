import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Hamduk Drive" },
      { name: "description", content: "Get help with rides, payments, driver onboarding, and account questions." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link to={user ? "/account" : "/"} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <h1 className="ml-3 text-base font-semibold">Support</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-muted-foreground">We typically reply within 12 hours.</p>
        <div className="mt-5 grid gap-3">
          <ContactCard icon={<Mail className="size-5" />} title="Email" href="mailto:support@hamdukdrive.com" value="support@hamdukdrive.com" />
          <ContactCard icon={<MessageCircle className="size-5" />} title="WhatsApp" href="https://wa.me/2348000000000" value="+234 800 000 0000" />
          <ContactCard icon={<Phone className="size-5" />} title="Safety hotline (24/7)" href="tel:+2348000000001" value="+234 800 000 0001" />
          <ContactCard icon={<Mail className="size-5" />} title="Driver onboarding" href="mailto:drivers@hamdukdrive.com" value="drivers@hamdukdrive.com" />
        </div>
      </main>
    </div>
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
