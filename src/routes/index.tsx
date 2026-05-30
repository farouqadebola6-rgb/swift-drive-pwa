import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, MessageCircle, MapPin, Wallet, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hamduk Drive — Cheaper rides for Lagos" },
      {
        name: "description",
        content:
          "Lagos-first ride hailing. Lower commission for drivers, fixed fares for riders, WhatsApp-native dispatch.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, role } = useAuth();
  const dashHref = user ? "/app" : "/auth";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur border-b border-border/60 bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="size-8 rounded-lg shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-primary)" }}
            />
            <span className="font-semibold tracking-tight">Hamduk Drive</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link to="/app">Open {role ?? "app"}</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth" search={{ mode: "signin" }}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get started
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <span className="size-1.5 rounded-full bg-accent" /> Built for Lagos
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Cheaper rides. <br />
              <span className="text-accent">Better earnings.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-primary-foreground/85 md:text-lg">
              A driver-first ride-hailing platform. We take just 5–8% commission — not 20%.
              Riders get fixed, upfront fares. Drivers get paid instantly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                asChild
              >
                <Link to={dashHref}>
                  Book a ride <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                asChild
              >
                <Link to="/auth" search={{ mode: "signup", role: "driver" }}>
                  Drive with us
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-primary-foreground/75">
              <Stat label="Driver commission" value="5–8%" />
              <Stat label="Dispatch latency" value="< 30s" />
              <Stat label="Launch zone" value="LASU axis" />
            </div>
          </div>

          {/* Visual card */}
          <div className="relative">
            <div className="relative mx-auto max-w-sm rounded-2xl bg-card p-5 shadow-[var(--shadow-elevated)] ring-1 ring-border/60">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Ride #1042</span>
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
                  Estimate ready
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <Row icon={<MapPin className="size-4 text-primary" />} label="Pickup" value="Agunm Okoafo" />
                <Row icon={<MapPin className="size-4 text-accent" />} label="Drop-off" value="Iyana Iba, Ojo" />
                <div className="flex items-end justify-between rounded-lg bg-secondary p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated fare</p>
                    <p className="text-2xl font-bold text-foreground">₦2,800</p>
                  </div>
                  <span className="text-xs text-muted-foreground">~18 min</span>
                </div>
                <Button className="w-full">Confirm ride</Button>
                <p className="text-center text-[10px] text-muted-foreground">
                  Price may vary slightly based on actual trip time.
                </p>
              </div>
            </div>
            <div
              className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl opacity-30 blur-3xl"
              style={{ background: "var(--gradient-accent)" }}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
          Built different, on purpose
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          No expensive native apps. No bloated real-time tracking. Just a fast PWA, WhatsApp
          dispatch, and instant Paystack payouts.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Feature
            icon={<MessageCircle className="size-5" />}
            title="WhatsApp dispatch"
            body="Rides are pushed to the driver group in seconds. First to accept wins. Familiar, fast, zero learning curve."
          />
          <Feature
            icon={<Wallet className="size-5" />}
            title="Instant cashout"
            body="Online fares split automatically via Paystack subaccounts. Drivers cash out to their bank any time."
          />
          <Feature
            icon={<ShieldCheck className="size-5" />}
            title="Verified drivers"
            body="Every driver is verified — digitally or in person — and carries a visible badge riders can trust."
          />
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Hamduk Unique Concept. Built for Lagos.
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-semibold text-primary-foreground">{value}</p>
      <p className="text-xs uppercase tracking-wide">{label}</p>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
      <div className="grid size-8 place-items-center rounded-md bg-secondary">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-elevated)]">
      <div
        className="mb-4 grid size-10 place-items-center rounded-lg text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
