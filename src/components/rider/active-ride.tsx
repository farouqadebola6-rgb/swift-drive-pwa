import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  MapPin,
  Phone,
  Star,
  XCircle,
  Car,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  cancelRide,
  naira,
  STATUS_LABEL,
  STATUS_TONE,
  type RideStatus,
} from "@/lib/ride-flow";

type ActiveRide = {
  id: number;
  status: RideStatus;
  pickup_address: string;
  destination_address: string;
  fare_estimate: number;
  final_fare: number | null;
  driver_id: string | null;
  payment_method: "online" | "cash";
  created_at: string;
};

interface Props {
  ride: ActiveRide;
}

export function RiderActiveRide({ ride }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Driver/profile lookup (only when assigned)
  const { data: driverInfo } = useQuery({
    queryKey: ["ride", ride.id, "driver", ride.driver_id],
    enabled: !!ride.driver_id,
    queryFn: async () => {
      const [profile, driver] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", ride.driver_id!)
          .maybeSingle(),
        supabase
          .from("drivers")
          .select("plate_number, vehicle_make, vehicle_model, vehicle_colour")
          .eq("user_id", ride.driver_id!)
          .maybeSingle(),
      ]);
      return { profile: profile.data, driver: driver.data };
    },
  });

  const { data: existingRating } = useQuery({
    queryKey: ["rating", ride.id],
    enabled: ride.status === "completed" && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("ratings")
        .select("score")
        .eq("ride_id", ride.id)
        .maybeSingle();
      return data;
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelRide(ride.id, "Cancelled by rider"),
    onSuccess: () => {
      toast.message("Ride cancelled.");
      void qc.invalidateQueries({ queryKey: ["rides"] });
      void qc.invalidateQueries({ queryKey: ["activeRide"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitRating = useMutation({
    mutationFn: async () => {
      if (!user || !ride.driver_id) throw new Error("Missing data");
      if (rating < 1) throw new Error("Pick a star rating");
      const { error } = await supabase.from("ratings").insert({
        ride_id: ride.id,
        rider_id: user.id,
        driver_id: ride.driver_id,
        score: rating,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for your feedback!");
      void qc.invalidateQueries({ queryKey: ["rating", ride.id] });
      void qc.invalidateQueries({ queryKey: ["activeRide"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canCancel = ride.status === "pending" || ride.status === "in_progress";
  const isCompleted = ride.status === "completed";

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge className={STATUS_TONE[ride.status]}>{STATUS_LABEL[ride.status]}</Badge>
          <h3 className="mt-2 text-lg font-semibold">Ride #{ride.id}</h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {isCompleted ? "Final fare" : "Fare estimate"}
          </div>
          <div className="text-xl font-bold">
            {naira(ride.final_fare ?? ride.fare_estimate)}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {ride.payment_method}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-primary" />
          <span>{ride.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-accent" />
          <span>{ride.destination_address}</span>
        </div>
      </div>

      {ride.driver_id && driverInfo && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Car className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {driverInfo.profile?.full_name ?? "Your driver"}
              </p>
              <p className="text-xs text-muted-foreground">
                {driverInfo.driver
                  ? `${driverInfo.driver.vehicle_colour ?? ""} ${driverInfo.driver.vehicle_make ?? ""} ${driverInfo.driver.vehicle_model ?? ""} · ${driverInfo.driver.plate_number ?? "—"}`
                  : "Vehicle details pending"}
              </p>
            </div>
            {driverInfo.profile?.phone && (
              <a
                href={`tel:${driverInfo.profile.phone}`}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Phone className="size-3.5" /> Call
              </a>
            )}
          </div>
        </div>
      )}

      {ride.status === "pending" && (
        <p className="mt-4 text-xs text-muted-foreground">
          We're notifying nearby drivers on WhatsApp. Hang tight — this usually takes
          under a minute.
        </p>
      )}

      {canCancel && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Cancel this ride?")) cancel.mutate();
            }}
            disabled={cancel.isPending}
          >
            <XCircle className="mr-2 size-4" /> Cancel ride
          </Button>
        </div>
      )}

      {isCompleted && !existingRating && (
        <div className="mt-5 border-t border-border pt-5">
          <p className="mb-2 text-sm font-medium">Rate your driver</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="p-1"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={
                    n <= rating
                      ? "size-7 fill-amber-400 text-amber-400"
                      : "size-7 text-muted-foreground"
                  }
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything to share? (optional)"
            className="mt-3"
            rows={2}
          />
          <Button
            className="mt-3"
            size="sm"
            onClick={() => submitRating.mutate()}
            disabled={submitRating.isPending || rating < 1}
          >
            {submitRating.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Submit rating
          </Button>
        </div>
      )}

      {isCompleted && existingRating && (
        <p className="mt-4 text-sm text-muted-foreground">
          You rated this trip {existingRating.score}/5 — thanks!
        </p>
      )}
    </Card>
  );
}
