import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function jidFor(phone: string): string {
  return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
}

function normalize(raw?: string | null): string | null {
  if (!raw) return null;
  let p = raw.replace(/\D/g, "");
  if (!p) return null;
  if (p.startsWith("00")) p = p.slice(2);
  if (/^0\d{10}$/.test(p)) p = "234" + p.slice(1);
  if (/^[789]\d{9}$/.test(p)) p = "234" + p;
  return p;
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

async function getOrigin(): Promise<string> {
  let origin = "https://swift-drive-pwa.lovable.app";
  try {
    const { getRequestHeader, getRequestHost } = await import(
      "@tanstack/react-start/server"
    );
    const proto = getRequestHeader("x-forwarded-proto") ?? "https";
    const host = getRequestHost();
    if (host) origin = `${proto}://${host}`;
  } catch {
    /* keep default */
  }
  return origin;
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

/* ============================================================
   SOS — live tracking session
   ============================================================ */

export const startSosSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        rideId: z.number().int().positive().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Reuse any still-active session for this user
    const { data: existing } = await supabaseAdmin
      .from("sos_sessions")
      .select("id, share_token, emergency_contact_phone")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, emergency_contact_phone")
      .eq("id", userId)
      .maybeSingle();
    const contact = normalize(prof?.emergency_contact_phone);

    let session = existing;
    if (!session) {
      const { data: created, error } = await supabaseAdmin
        .from("sos_sessions")
        .insert({
          user_id: userId,
          ride_id: data.rideId ?? null,
          initial_lat: data.lat ?? null,
          initial_lng: data.lng ?? null,
          last_lat: data.lat ?? null,
          last_lng: data.lng ?? null,
          last_ping_at: new Date().toISOString(),
          emergency_contact_phone: contact,
        })
        .select("id, share_token, emergency_contact_phone")
        .single();
      if (error) throw new Error(error.message);
      session = created;
    } else {
      await supabaseAdmin
        .from("sos_sessions")
        .update({
          last_lat: data.lat ?? null,
          last_lng: data.lng ?? null,
          last_ping_at: new Date().toISOString(),
        })
        .eq("id", session.id);
    }

    const origin = await getOrigin();
    const link = `${origin}/sos/${session.share_token}`;
    let delivered = false;
    if (contact && !existing) {
      const locText =
        data.lat != null && data.lng != null
          ? `https://maps.google.com/?q=${data.lat},${data.lng}`
          : "(location not yet shared)";
      const text =
        `🚨 SOS from ${prof?.full_name ?? "a Hamduk Drive user"}\n` +
        `They have dialled 112.\n\n` +
        `Last location: ${locText}\n` +
        `Live tracking (auto-updates every few minutes): ${link}\n\n` +
        `Stay on this link until they're safe.`;
      const r = await sendWhatsapp(jidFor(contact), text);
      delivered = r.ok;
    }

    return {
      sessionId: session.id,
      shareToken: session.share_token,
      hasContact: !!contact,
      delivered,
      link,
    };
  });

export const pingSosLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        sessionId: z.number().int().positive(),
        lat: z.number(),
        lng: z.number(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("sos_sessions")
      .select("id, user_id, status")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!row || row.user_id !== userId) throw new Error("Not your session");
    if (row.status !== "active") return { status: row.status };
    await supabaseAdmin
      .from("sos_sessions")
      .update({
        last_lat: data.lat,
        last_lng: data.lng,
        last_ping_at: new Date().toISOString(),
      })
      .eq("id", data.sessionId);
    return { status: "active" as const };
  });

export const stopSosSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ sessionId: z.number().int().positive() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    // RLS allows owner or admin
    const { data: row, error } = await supabase
      .from("sos_sessions")
      .update({
        status: "stopped",
        stopped_at: new Date().toISOString(),
        stopped_by: userId,
      })
      .eq("id", data.sessionId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: !!row };
  });

export const getSharedSos = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ token: z.string().min(8).max(64) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("sos_sessions")
      .select(
        "id, status, started_at, last_lat, last_lng, last_ping_at, ride_id, user_id, stopped_at",
      )
      .eq("share_token", data.token)
      .maybeSingle();
    if (!row) return null;
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", row.user_id)
      .maybeSingle();
    let ride = null;
    if (row.ride_id) {
      const { data: r } = await supabaseAdmin
        .from("rides")
        .select("id, status, pickup_address, destination_address")
        .eq("id", row.ride_id)
        .maybeSingle();
      ride = r;
    }
    return {
      status: row.status,
      started_at: row.started_at,
      last_lat: row.last_lat,
      last_lng: row.last_lng,
      last_ping_at: row.last_ping_at,
      stopped_at: row.stopped_at,
      user_name: prof?.full_name ?? "Hamduk user",
      user_phone: prof?.phone ?? null,
      ride,
    };
  });

/* ============================================================
   Share trip — includes current coords
   ============================================================ */

// Backward-compat alias — callers may still import `triggerSos`. Behaves
// identically to startSosSession.
export const triggerSos = startSosSession;


export const shareTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        rideId: z.number().int().positive(),
        contactPhone: z.string().min(7).max(20).optional(),
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
      .select("full_name, emergency_contact_phone")
      .eq("id", userId)
      .maybeSingle();
    const rawContact = data.contactPhone ?? prof?.emergency_contact_phone;
    const phone = normalize(rawContact);
    if (!phone) throw new Error("No emergency contact on file");

    const origin = await getOrigin();
    const link = `${origin}/trip/${ride.share_token}`;
    const locLine =
      data.lat != null && data.lng != null
        ? `Current location: https://maps.google.com/?q=${data.lat},${data.lng}\n`
        : "";
    const text =
      `🛡️ ${prof?.full_name ?? "Your contact"} is sharing a Hamduk Drive trip with you.\n\n` +
      `Ride #${ride.id} — ${ride.status}\n` +
      `Pickup: ${ride.pickup_address}\n` +
      `Drop: ${ride.destination_address}\n` +
      locLine +
      `\nLive trip details: ${link}`;
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
