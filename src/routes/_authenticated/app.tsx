import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { RiderHome } from "@/components/dashboards/rider-home";
import { DriverHome } from "@/components/dashboards/driver-home";
import { AdminHome } from "@/components/dashboards/admin-home";
import { NoRole } from "@/components/dashboards/no-role";
import { PullToRefresh } from "@/components/pull-to-refresh";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard — Hamduk Drive" }] }),
  component: AppDispatcher,
});

function AppDispatcher() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const onRefresh = () => qc.invalidateQueries();

  let inner: React.ReactNode;
  if (role === "admin") inner = <AdminHome />;
  else if (role === "driver") inner = <DriverHome />;
  else if (role === "rider") inner = <RiderHome />;
  else inner = <NoRole />;

  return <PullToRefresh onRefresh={onRefresh}>{inner}</PullToRefresh>;
}
