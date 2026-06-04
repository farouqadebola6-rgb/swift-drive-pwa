import { Link, useLocation } from "@tanstack/react-router";
import { Home, Car, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const HIDE_ON = ["/auth", "/forgot-password", "/reset-password", "/welcome", "/verify-email", "/pay/callback"];

export function BottomTabBar() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  if (loading || !user) return null;
  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

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
        p.startsWith("/support") ||
        p.startsWith("/privacy") ||
        p.startsWith("/terms"),
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
