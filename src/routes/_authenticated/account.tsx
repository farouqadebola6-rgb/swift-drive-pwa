import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { User, ShieldCheck, LifeBuoy, MapPin, Settings, LogOut, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account — Hamduk Drive" }] }),
  component: AccountPage,
});

const items = [
  { to: "/profile", label: "Profile", icon: User, desc: "Your name, phone, and email" },
  { to: "/safety", label: "Safety", icon: ShieldCheck, desc: "Emergency contacts & trip sharing" },
  { to: "/support", label: "Support", icon: LifeBuoy, desc: "Get help with rides or your account" },
  { to: "/saved-places", label: "Saved places", icon: MapPin, desc: "Home, work, and favourites" },
  { to: "/settings", label: "Settings", icon: Settings, desc: "Notifications, privacy, delete account" },
] as const;

function AccountPage() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardShell title="Account">
      <Card className="mb-5 flex items-center gap-3 rounded-2xl p-4">
        <div
          className="grid size-12 place-items-center rounded-full text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <User className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user?.email}</p>
          <p className="text-xs capitalize text-muted-foreground">{role ?? "—"}</p>
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl p-0">
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.to}>
              <Link
                to={it.to}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-muted text-foreground">
                  <it.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{it.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.desc}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Button
        variant="outline"
        className="mt-5 h-12 w-full rounded-full"
        onClick={() => void signOut().then(() => navigate({ to: "/" }))}
      >
        <LogOut className="mr-2 size-4" /> Sign out
      </Button>
    </DashboardShell>
  );
}
