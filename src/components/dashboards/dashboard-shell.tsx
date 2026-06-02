import { type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Home, User, LifeBuoy, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardShell({
  title,
  subtitle,
  children,
  badge,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-muted/40 pb-20 md:pb-0">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="size-7 rounded-md"
              style={{ background: "var(--gradient-primary)" }}
            />
            <span className="font-semibold tracking-tight">Hamduk Drive</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => void signOut()}
            >
              <LogOut className="mr-1.5 size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {badge}
        </div>
        {children}
      </main>

      <BottomTabBar />
    </div>
  );
}

function BottomTabBar() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/app", label: "Home", icon: Home },
    { to: "/support", label: "Support", icon: LifeBuoy },
    { to: "/account", label: "Account", icon: User },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-5xl items-stretch justify-around">
        {tabs.map((t) => {
          const active =
            t.to === "/app" ? pathname === "/app" : pathname.startsWith(t.to);
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
