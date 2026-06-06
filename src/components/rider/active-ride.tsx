import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, MapPin, Phone, Star, XCircle, Car, CheckCircle2, Siren, Share2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  cancelRide, naira, STATUS_LABEL, STATUS_TONE, type RideStatus,
} from "@/lib/ride-flow";
import { initRidePayment, getRidePaymentStatus } from "@/lib/paystack.functions";
import { getUserRatingSummary } from "@/lib/ratings.functions";
import { triggerSos, shareTrip } from "@/lib/safety.functions";

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

interface Props { ride: ActiveRide }

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

export function RiderActiveRide({ ride }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const payStatusFn = useServerFn(getRidePaymentStatus);
  const ratingFn = useServerFn(getUserRatingSummary);
  const sosFn = useServerFn(triggerSos);
  const shareFn = useServerFn(shareTrip);

  const { data: driverInfo } = useQuery({
    queryKey: ["ride", ride.id, "driver", ride.driver_id],
    enabled: !!ride.driver_id,
    queryFn: async () => {
      const [profile, driver] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", ride.driver_id!).maybeSingle(),
        supabase.from("drivers").select("plate_number, vehicle_make, vehicle_model, vehicle_colour").eq("user_id", ride.driver_id!).maybeSingle(),
      ]);
      return { profile: profile.data, driver: driver.data };
    },
  });

  const { data: driverRating } = useQuery({
    queryKey: ["userRating", ride.driver_id],
    enabled: !!ride.driver_id,
    queryFn: () => ratingFn({ data: { userId: ride.driver_id! } }),
  });

  const { data: paymentRow } = useQuery({
    queryKey: ["ride", ride.id, "payment"],
    enabled: ride.payment_method === "online",
    refetchInterval: ride.status === "started" || ride.status === "completed" ? 4000 : false,
    queryFn: () => payStatusFn({ data: { rideId: ride.id } }),
  });

  const { data: existingRating } = useQuery({
    queryKey: ["rating", ride.id],
    enabled: ride.status === "completed" && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("ratings").select("score").eq("ride_id", ride.id).maybeSingle();
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
        ride_id: ride.id, rider_id: user.id, driver_id: ride.driver_id,
        score: rating, comment: comment || null,
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

  const sos = useMutation({
    mutationFn: async () => {
      const pos = await getPosition();
      window.location.href = "tel:112";
      return sosFn({ data: { rideId: ride.id, lat: pos?.lat, lng: pos?.lng } });
    },
    onSuccess: (r) => {
      if (!r.hasContact) toast.warning("Add an emergency contact in Safety to alert someone next time.");
      else toast.success(r.delivered ? "Emergency contact notified." : "Could not reach emergency contact.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const share = useMutation({
    mutationFn: () => shareFn({ data: { rideId: ride.id } }),
    onSuccess: (r) => {
      toast.success("Trip shared via WhatsApp.");
      if (r.link && navigator.clipboard) void navigator.clipboard.writeText(r.link);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payStatus = paymentRow?.status as string | undefined;
  const isPaid = payStatus === "captured" || payStatus === "authorized" || payStatus === "success";
  const canCancel = ride.status === "pending" || ride.status === "in_progress";
  const isCompleted = ride.status === "completed";
  const isActive = ride.status === "in_progress" || ride.status === "driver_arrived" || ride.status === "started";

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge className={STATUS_TONE[ride.status]}>{STATUS_LABEL[ride.status]}</Badge>
          <h3 className="mt-2 text-lg font-semibold">Ride #{ride.id}</h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{isCompleted ? "Final fare" : "Fare estimate"}</div>
          <div className="text-xl font-bold">{naira(ride.final_fare ?? ride.fare_estimate)}</div>
          <div className="text-xs text-muted-foreground capitalize">{ride.payment_method}</div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-primary" /><span>{ride.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-accent" /><span>{ride.destination_address}</span>
        </div>
      </div>

      {ride.driver_id && driverInfo && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            {driverInfo.profile?.avatar_url ? (
              <img src={driverInfo.profile.avatar_url} alt="" className="size-12 rounded-full object-cover" />
            ) : (
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Car className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{driverInfo.profile?.full_name ?? "Your driver"}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {driverRating && driverRating.count > 0
                  ? `${driverRating.avg.toFixed(1)} · ${driverRating.count} trip${driverRating.count === 1 ? "" : "s"}`
                  : "New driver"}
              </div>
            </div>
            <div className="text-right">
              {driverInfo.driver?.plate_number && (
                <div className="rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold tracking-wide">
                  {driverInfo.driver.plate_number}
                </div>
              )}
              <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                {[driverInfo.driver?.vehicle_colour, driverInfo.driver?.vehicle_make, driverInfo.driver?.vehicle_model].filter(Boolean).join(" ")}
              </p>
            </div>
          </div>
          {driverInfo.profile?.phone && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${driverInfo.profile.phone}`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background py-2 text-sm font-medium hover:bg-accent">
                <Phone className="size-4" /> Call
              </a>
              <a href={`https://wa.me/${driverInfo.profile.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background py-2 text-sm font-medium hover:bg-accent">
                WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {ride.status === "pending" && (
        <p className="mt-4 text-xs text-muted-foreground">
          We're notifying nearby drivers on WhatsApp. Hang tight — this usually takes under a minute.
        </p>
      )}

      {isActive && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => share.mutate()} disabled={share.isPending} className="h-11">
            {share.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Share2 className="mr-2 size-4" />}
            Share trip
          </Button>
          <Button variant="destructive" onClick={() => { if (confirm("Trigger SOS? This will dial 112 and alert your emergency contact.")) sos.mutate(); }} disabled={sos.isPending} className="h-11">
            {sos.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Siren className="mr-2 size-4" />}
            SOS — 112
          </Button>
        </div>
      )}

      {canCancel && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => { if (confirm("Cancel this ride?")) cancel.mutate(); }} disabled={cancel.isPending}>
            <XCircle className="mr-2 size-4" /> Cancel ride
          </Button>
        </div>
      )}

      {ride.payment_method === "online" && (ride.status === "started" || ride.status === "completed") && (
        isPaid ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" /> Paid
          </div>
        ) : (
          <PayOnlineButton rideId={ride.id} />
        )
      )}

      {isCompleted && !existingRating && (
        <div className="mt-5 border-t border-border pt-5">
          <p className="mb-2 text-sm font-medium">Rate your driver</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className="p-1" aria-label={`${n} star${n > 1 ? "s" : ""}`}>
                <Star className={n <= rating ? "size-7 fill-amber-400 text-amber-400" : "size-7 text-muted-foreground"} />
              </button>
            ))}
          </div>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Anything to share? (optional)" className="mt-3" rows={2} />
          <Button className="mt-3" size="sm" onClick={() => submitRating.mutate()} disabled={submitRating.isPending || rating < 1}>
            {submitRating.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Submit rating
          </Button>
        </div>
      )}

      {isCompleted && existingRating && (
        <p className="mt-4 text-sm text-muted-foreground">You rated this trip {existingRating.score}/5 — thanks!</p>
      )}
    </Card>
  );
}

function PayOnlineButton({ rideId }: { rideId: number }) {
  const pay = useMutation({
    mutationFn: async () => {
      const init = await initRidePayment({ data: { rideId } });
      if (!init.authorization_url) throw new Error("Could not start payment");
      window.location.href = init.authorization_url;
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-4">
      <Button onClick={() => pay.mutate()} disabled={pay.isPending}>
        {pay.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Pay online now
      </Button>
    </div>
  );
}
