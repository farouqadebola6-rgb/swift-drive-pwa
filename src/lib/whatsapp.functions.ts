import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Broadcast a ride request to the verified-driver WhatsApp group via the
 * self-hosted Baileys microservice. The microservice is expected to expose:
 *
 *   POST {WHATSAPP_DISPATCH_URL}
 *   Headers: Authorization: Bearer {WHATSAPP_DISPATCH_TOKEN}
 *   Body:    { jid: string, text: string }
 *
 * Idempotent on rides.dispatched_at: a ride is only ever broadcast once.
 */
export const dispatchRideToGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ rideId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: ride, error: rideErr } = await supabaseAdmin
      .from("rides")
      .select(
        "id, rider_id, status, dispatched_at, pickup_area, destination_area, pickup_address, destination_address, fare_estimate, estimated_distance_km, estimated_duration_min, payment_method, acceptance_token",
      )
      .eq("id", data.rideId)
      .maybeSingle();
    if (rideErr) throw new Error(rideErr.message);
    if (!ride) throw new Error("Ride not found");
    if (ride.rider_id !== userId) throw new Error("Not your ride");
    if (ride.dispatched_at) return { ok: true, already: true };
    if (ride.status !== "pending") return { ok: true, skipped: true };

    const { data: cfg } = await supabaseAdmin
      .from("pricing_config")
      .select("whatsapp_group_jid")
      .eq("id", 1)
      .maybeSingle();

    const jid = cfg?.whatsapp_group_jid;
    const url = process.env.WHATSAPP_DISPATCH_URL;
    const token = process.env.WHATSAPP_DISPATCH_TOKEN;

    if (!jid || !url || !token) {
      // Log but do not throw — booking still succeeds.
      await supabaseAdmin.from("dispatch_logs").insert({
        ride_id: ride.id,
        message_body: "[skipped: dispatcher not configured]",
        status: "skipped",
      });
      return { ok: false, reason: "not_configured" };
    }

    const text = [
      `🚖 New ride request #${ride.id}`,
      ``,
      `📍 Pickup: ${ride.pickup_area} — ${ride.pickup_address}`,
      `🏁 Drop: ${ride.destination_area} — ${ride.destination_address}`,
      `📏 ${Number(ride.estimated_distance_km ?? 0).toFixed(1)} km · ⏱ ${Math.round(Number(ride.estimated_duration_min ?? 0))} min`,
      `💵 ₦${Number(ride.fare_estimate).toLocaleString()} (${ride.payment_method})`,
      ``,
      `First verified driver to tap Accept in the app gets it.`,
    ].join("\n");

    try {
      const resp = await fetch(`${url.replace(/\/$/, "")}/message/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jid, text }),
      });
      const okBody = await resp.text();
      const ok = resp.ok;
      await supabaseAdmin.from("dispatch_logs").insert({
        ride_id: ride.id,
        message_body: text,
        status: ok ? "sent" : "failed",
        error_message: ok ? null : okBody.slice(0, 500),
      });
      if (ok) {
        await supabaseAdmin
          .from("rides")
          .update({ dispatched_at: new Date().toISOString() })
          .eq("id", ride.id);
      }
      return { ok };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin.from("dispatch_logs").insert({
        ride_id: ride.id,
        message_body: text,
        status: "failed",
        error_message: msg.slice(0, 500),
      });
      return { ok: false, reason: msg };
    }
  });
