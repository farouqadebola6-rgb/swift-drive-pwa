import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboards/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Loader2, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Hamduk Drive" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
      void qc.invalidateQueries({ queryKey: ["notifications", "unread", user?.id] });
    },
  });

  return (
    <DashboardShell
      title="Notifications"
      badge={
        items.some((n) => !n.read_at) ? (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => markAll.mutate()}>
            <CheckCheck className="mr-1.5 size-4" /> Mark all read
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <Bell className="size-6" />
          </div>
          <p className="mt-3 text-sm font-medium">No notifications yet</p>
          <p className="text-xs text-muted-foreground">
            Ride updates and account alerts will show up here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`rounded-2xl p-4 ${!n.read_at ? "border-primary/40 bg-primary/5" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{n.title}</p>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
