import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { RiderHome } from "@/components/dashboards/rider-home";
import { DriverHome } from "@/components/dashboards/driver-home";
import { AdminHome } from "@/components/dashboards/admin-home";
import { NoRole } from "@/components/dashboards/no-role";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard — Hamduk Drive" }] }),
  component: AppDispatcher,
});

function AppDispatcher() {
  const { role } = useAuth();
  if (role === "admin") return <AdminHome />;
  if (role === "driver") return <DriverHome />;
  if (role === "rider") return <RiderHome />;
  return <NoRole />;
}
