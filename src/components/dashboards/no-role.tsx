import { DashboardShell } from "./dashboard-shell";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function NoRole() {
  return (
    <DashboardShell title="Account">
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="size-5 text-warning" />
          <div>
            <h3 className="font-semibold">No role assigned</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account doesn't have an active role. Please contact support.
            </p>
          </div>
        </div>
      </Card>
    </DashboardShell>
  );
}
