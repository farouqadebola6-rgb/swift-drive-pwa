import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Mail, MessageCircle, Phone, MapPin, Camera, Bell } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Hamduk Drive" },
      { name: "description", content: "Get help with rides, payments, driver onboarding, and account questions." },
      { property: "og:title", content: "Support — Hamduk Drive" },
      { property: "og:description", content: "Get help with rides, payments, driver onboarding, and account questions." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back home</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Support</h1>
        <p className="mt-2 text-muted-foreground">We typically reply within 12 hours.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ContactCard
            icon={<Mail className="size-5" />}
            title="Email"
            href="mailto:support@hamdukdrive.com"
            value="support@hamdukdrive.com"
          />
          <ContactCard
            icon={<MessageCircle className="size-5" />}
            title="WhatsApp"
            href="https://wa.me/2348000000000"
            value="+234 800 000 0000"
          />
          <ContactCard
            icon={<Phone className="size-5" />}
            title="Safety hotline (24/7)"
            href="tel:+2348000000001"
            value="+234 800 000 0001"
          />
          <ContactCard
            icon={<Mail className="size-5" />}
            title="Driver onboarding"
            href="mailto:drivers@hamdukdrive.com"
            value="drivers@hamdukdrive.com"
          />
        </div>

        <h2 className="mt-12 text-xl font-semibold">Why we ask for permissions</h2>
        <p className="mt-1 text-sm text-muted-foreground">You can deny any permission and still use the app — we'll fall back to manual entry where possible.</p>
        <div className="mt-4 space-y-3">
          <PermissionRow
            icon={<MapPin className="size-4" />}
            name="Location"
            why="Set your pickup automatically, route your trip, and let your driver find you. Used only while booking or on an active trip — never in the background."
          />
          <PermissionRow
            icon={<Bell className="size-4" />}
            name="Notifications"
            why="Tell you when a driver accepts, arrives, or your trip ends. You can turn these off in your device settings any time."
          />
          <PermissionRow
            icon={<Camera className="size-4" />}
            name="Camera & files (drivers only)"
            why="Upload your driver's licence, vehicle photo, and registration during onboarding. Documents are stored encrypted and only seen by our verification team."
          />
        </div>

        <h2 className="mt-12 text-xl font-semibold">Common questions</h2>
        <div className="mt-4 space-y-3 text-sm">
          <Faq q="How do I delete my account?" a={<>Sign in, open <em>Account</em>, scroll to the bottom, and tap <em>Delete account</em>. Active rides are cancelled and personal data is purged within 30 days. You can also email <a className="text-primary underline" href="mailto:support@hamdukdrive.com">support@hamdukdrive.com</a> to request deletion.</>} />
          <Faq q="How are fares calculated?" a="Base fare + per-km rate + per-minute rate. The estimate shown before booking is the price you pay if the route matches the actual trip. Tolls and surcharges are extra and shown on the receipt." />
          <Faq q="How do drivers get paid?" a="Online rides split automatically via Paystack — your portion lands in your bank within 24 hours. Cash rides go directly to you; the commission is added to your in-app debt balance and settles when you next take an online ride." />
          <Faq q="My driver/rider never showed up." a={<>Cancel from the active ride screen and report the no-show via WhatsApp or email above. We refund online cancellation fees in clear no-show cases.</>} />
        </div>
      </main>
    </div>
  );
}

function ContactCard({ icon, title, value, href }: { icon: React.ReactNode; title: string; value: string; href: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <a href={href} className="block truncate text-sm font-medium text-foreground hover:underline">{value}</a>
        </div>
      </div>
    </Card>
  );
}

function PermissionRow({ icon, name, why }: { icon: React.ReactNode; name: string; why: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-8 place-items-center rounded-md bg-secondary text-secondary-foreground">{icon}</div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{why}</p>
        </div>
      </div>
    </Card>
  );
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="font-medium">{q}</p>
      <p className="mt-1 text-muted-foreground">{a}</p>
    </Card>
  );
}
