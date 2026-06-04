import { createFileRoute, Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Home, Car, User } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signin", role: "rider" } });
      return;
    }
    if (!user.email_confirmed_at && location.pathname !== "/verify-email") {
      navigate({ to: "/verify-email" });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Outlet />
      <BottomTabBar />
    </div>
  );
}

function BottomTabBar() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/app", label: "Home", icon: Home, match: (p: string) => p === "/app" },
    { to: "/rides", label: "Rides", icon: Car, match: (p: string) => p.startsWith("/rides") },
    {
      to: "/account",
      label: "Account",
      icon: User,
      match: (p: string) =>
        p.startsWith("/account") ||
        p.startsWith("/profile") ||
        p.startsWith("/safety") ||
        p.startsWith("/saved-places") ||
        p.startsWith("/settings") ||
        p.startsWith("/support"),
    },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-5xl items-stretch justify-around">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
