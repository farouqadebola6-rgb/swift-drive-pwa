import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function jidFor(phone: string): string {
  return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
}

async function sendWhatsapp(jid: string, text: string) {
  const url = process.env.WHATSAPP_DISPATCH_URL;
  const token = process.env.WHATSAPP_DISPATCH_TOKEN;
  if (!url || !token) return { ok: false, reason: "not_configured" as const };
  const resp = await fetch(`${url.replace(/\/$/, "")}/message/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jid, text }),
  });
  return { ok: resp.ok, status: resp.status };
}

async function loadRideForOwner(rideId: number, userId: string) {
  const { data: ride } = await supabaseAdmin
    .from("rides")
    .select(
      "id, rider_id, driver_id, status, share_token, pickup_address, destination_address, payment_method",
    )
    .eq("id", rideId)
    .maybeSingle();
  if (!ride) throw new Error("Ride not found");
  if (ride.rider_id !== userId && ride.driver_id !== userId)
    throw new Error("Not your ride");
  return ride;
}

export const triggerSos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        rideId: z.number().int().positive(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const ride = await loadRideForOwner(data.rideId, userId);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, emergency_contact_name, emergency_contact_phone")
      .eq("id", userId)
      .maybeSingle();
    const loc =
      data.lat != null && data.lng != null
        ? `https://maps.google.com/?q=${data.lat},${data.lng}`
        : "(location not shared)";
    const text =
      `🚨 SOS from ${prof?.full_name ?? "a Hamduk Drive user"}\n` +
      `Ride #${ride.id} — ${ride.status}\n` +
      `Pickup: ${ride.pickup_address}\n` +
      `Drop: ${ride.destination_address}\n` +
      `Last location: ${loc}\n` +
      `Time: ${new Date().toLocaleString()}\n\n` +
      `They have also dialled 112.`;
    let delivered = false;
    if (prof?.emergency_contact_phone) {
      const r = await sendWhatsapp(jidFor(prof.emergency_contact_phone), text);
      delivered = r.ok;
    }
    return { delivered, hasContact: !!prof?.emergency_contact_phone };
  });

export const shareTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        rideId: z.number().int().positive(),
        contactPhone: z.string().min(7).max(20).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const ride = await loadRideForOwner(data.rideId, userId);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, emergency_contact_phone")
      .eq("id", userId)
      .maybeSingle();
    const phone = data.contactPhone ?? prof?.emergency_contact_phone;
    if (!phone) throw new Error("No emergency contact on file");

    // Build absolute origin
    let origin = "https://swift-drive-pwa.lovable.app";
    try {
      const { getRequestHeader, getRequestHost } = await import(
        "@tanstack/react-start/server"
      );
      const proto = getRequestHeader("x-forwarded-proto") ?? "https";
      const host = getRequestHost();
      if (host) origin = `${proto}://${host}`;
    } catch {
      /* default origin */
    }
    const link = `${origin}/trip/${ride.share_token}`;
    const text =
      `🛡️ ${prof?.full_name ?? "Your contact"} is sharing a Hamduk Drive trip with you.\n\n` +
      `Ride #${ride.id} — ${ride.status}\n` +
      `Pickup: ${ride.pickup_address}\n` +
      `Drop: ${ride.destination_address}\n\n` +
      `Live trip details: ${link}`;
    const r = await sendWhatsapp(jidFor(phone), text);
    return { ok: r.ok, link };
  });

export const getSharedTrip = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token: z.string().min(8).max(64) }).parse(i))
  .handler(async ({ data }) => {
    const { data: ride } = await supabaseAdmin
      .from("rides")
      .select(
        "id, status, pickup_address, destination_address, pickup_lat, pickup_lng, destination_lat, destination_lng, fare_estimate, created_at, driver_id, rider_id",
      )
      .eq("share_token", data.token)
      .maybeSingle();
    if (!ride) return null;
    const [{ data: rider }, { data: driver }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", ride.rider_id)
        .maybeSingle(),
      ride.driver_id
        ? supabaseAdmin
            .from("profiles")
            .select("full_name")
            .eq("id", ride.driver_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    let vehicle = null as null | {
      make: string | null;
      model: string | null;
      colour: string | null;
      plate: string | null;
    };
    if (ride.driver_id) {
      const { data: drv } = await supabaseAdmin
        .from("drivers")
        .select("vehicle_make, vehicle_model, vehicle_colour, plate_number")
        .eq("user_id", ride.driver_id)
        .maybeSingle();
      if (drv)
        vehicle = {
          make: drv.vehicle_make,
          model: drv.vehicle_model,
          colour: drv.vehicle_colour,
          plate: drv.plate_number,
        };
    }
    return {
      id: ride.id,
      status: ride.status,
      pickup_address: ride.pickup_address,
      destination_address: ride.destination_address,
      created_at: ride.created_at,
      rider_name: rider?.full_name ?? "Rider",
      driver_name: driver?.full_name ?? null,
      vehicle,
    };
  });

export const reportIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        category: z.string().min(1).max(60),
        description: z.string().min(10).max(2000),
        rideId: z.number().int().positive().optional(),
        contactPhone: z.string().max(20).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.from("incident_reports").insert({
      user_id: userId,
      ride_id: data.rideId ?? null,
      category: data.category,
      description: data.description,
      contact_phone: data.contactPhone ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
