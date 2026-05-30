import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RideStatus = Database["public"]["Enums"]["ride_status"];

export const STATUS_LABEL: Record<RideStatus, string> = {
  pending: "Searching for driver",
  in_progress: "Driver en route",
  driver_arrived: "Driver arrived",
  started: "Trip in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<RideStatus, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  in_progress: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
  driver_arrived: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200",
  started: "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200",
  completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  cancelled: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200",
};

export function naira(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export async function acceptRide(rideId: number) {
  const { data, error } = await supabase.rpc("accept_ride", { p_ride_id: rideId });
  if (error) throw error;
  return data;
}

export async function markRideStatus(rideId: number, status: "driver_arrived" | "started") {
  const { data, error } = await supabase.rpc("mark_ride_status", {
    p_ride_id: rideId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}

export async function completeRide(
  rideId: number,
  distance_km: number,
  duration_min: number,
) {
  const { data, error } = await supabase.rpc("complete_ride", {
    p_ride_id: rideId,
    p_actual_distance_km: distance_km,
    p_actual_duration_min: duration_min,
  });
  if (error) throw error;
  return data;
}

export async function cancelRide(rideId: number, reason: string) {
  const { error } = await supabase
    .from("rides")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", rideId);
  if (error) throw error;
}
