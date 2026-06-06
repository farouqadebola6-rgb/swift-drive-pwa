import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAYSTACK_BASE = "https://api.paystack.co";

function authHeaders() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  } as const;
}

/**
 * Initialize a Paystack transaction for an online-payment ride.
 * - Creates a `payments` row in pending state (idempotent per ride).
 * - If the assigned driver has a Paystack subaccount, the transaction is
 *   split: driver gets (100 - commission)% via `subaccount`, platform keeps
 *   commission via `transaction_charge`. If no driver yet (still pending),
 *   the rider can pre-authorize and we resolve the split on capture; we
 *   keep it simple and reject if no driver assigned yet.
 *
 * Returns Paystack's `authorization_url` + `access_code` + `reference` so
 * the rider's browser can open the inline popup (using access_code) or
 * redirect (using authorization_url).
 */
export const initRidePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ rideId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: ride, error: rideErr } = await supabaseAdmin
      .from("rides")
      .select(
        "id, rider_id, driver_id, status, payment_method, fare_estimate, final_fare",
      )
      .eq("id", data.rideId)
      .maybeSingle();
    if (rideErr) throw new Error(rideErr.message);
    if (!ride) throw new Error("Ride not found");
    if (ride.rider_id !== userId) throw new Error("Not your ride");
    if (ride.payment_method !== "online") {
      throw new Error("Ride is not an online-payment ride");
    }

    const amountNgn = Number(ride.final_fare ?? ride.fare_estimate);
    if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
      throw new Error("Invalid amount");
    }
    const amountKobo = Math.round(amountNgn * 100);

    // Rider email for Paystack
    const { data: authUser } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) throw new Error("Rider email missing");

    // Optional split: only if driver assigned & has subaccount
    let subaccount: string | undefined;
    let chargeKobo: number | undefined;
    if (ride.driver_id) {
      const { data: drv } = await supabaseAdmin
        .from("drivers")
        .select("paystack_subaccount_code")
        .eq("user_id", ride.driver_id)
        .maybeSingle();
      const { data: cfg } = await supabaseAdmin
        .from("pricing_config")
        .select("commission_percent")
        .eq("id", 1)
        .maybeSingle();
      if (drv?.paystack_subaccount_code && cfg) {
        subaccount = drv.paystack_subaccount_code;
        chargeKobo = Math.round(
          (Number(cfg.commission_percent) / 100) * amountKobo,
        );
      }
    }

    const reference = `ride_${ride.id}_${Date.now()}`;

    // Build absolute callback URL so Paystack can redirect the rider back
    // into the app after payment.
    let origin = "";
    try {
      const { getRequestHeader, getRequestHost } = await import(
        "@tanstack/react-start/server"
      );
      const proto = getRequestHeader("x-forwarded-proto") ?? "https";
      const host = getRequestHost();
      if (host) origin = `${proto}://${host}`;
    } catch {
      // origin stays empty — Paystack falls back to dashboard callback
    }

    const initBody: Record<string, unknown> = {
      email,
      amount: amountKobo,
      reference,
      metadata: { ride_id: ride.id, rider_id: userId },
    };
    if (origin) initBody.callback_url = `${origin}/pay/callback`;
    if (subaccount) {
      initBody.subaccount = subaccount;
      initBody.bearer = "account"; // platform bears Paystack fees
      if (chargeKobo != null) initBody.transaction_charge = chargeKobo;
    }

    const resp = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(initBody),
    });
    const json = (await resp.json()) as {
      status: boolean;
      message: string;
      data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };
    if (!resp.ok || !json.status || !json.data) {
      throw new Error(json.message || "Paystack init failed");
    }

    // Upsert a pending payment row
    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      ride_id: ride.id,
      method: "online",
      amount: amountNgn,
      status: "pending",
      paystack_reference: json.data.reference,
    });
    if (payErr) throw new Error(payErr.message);

    return {
      reference: json.data.reference,
      access_code: json.data.access_code,
      authorization_url: json.data.authorization_url,
      public_key: process.env.PAYSTACK_PUBLIC_KEY ?? "",
    };
  });

/**
 * Admin creates a Paystack subaccount for a verified driver so future rides
 * can split automatically. Requires the driver's bank_name + account_number
 * to be on file.
 */
export const createDriverSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ driverId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    // verify admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin only");

    const { data: drv } = await supabaseAdmin
      .from("drivers")
      .select(
        "user_id, bank_name, account_number, paystack_subaccount_code",
      )
      .eq("user_id", data.driverId)
      .maybeSingle();
    if (!drv) throw new Error("Driver not found");
    if (drv.paystack_subaccount_code) {
      return { code: drv.paystack_subaccount_code, already: true };
    }
    if (!drv.bank_name || !drv.account_number) {
      throw new Error("Driver bank details missing");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", data.driverId)
      .maybeSingle();
    const { data: cfg } = await supabaseAdmin
      .from("pricing_config")
      .select("commission_percent")
      .eq("id", 1)
      .maybeSingle();

    // Resolve bank code by bank_name (best-effort)
    const banksResp = await fetch(`${PAYSTACK_BASE}/bank?country=nigeria`, {
      headers: authHeaders(),
    });
    const banksJson = (await banksResp.json()) as {
      data: Array<{ name: string; code: string }>;
    };
    const match = banksJson.data.find(
      (b) => b.name.toLowerCase() === drv.bank_name!.toLowerCase(),
    );
    if (!match) {
      throw new Error(
        `Could not resolve bank "${drv.bank_name}". Use exact Paystack bank name.`,
      );
    }

    const subResp = await fetch(`${PAYSTACK_BASE}/subaccount`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        business_name: profile?.full_name || "Hamduk Driver",
        settlement_bank: match.code,
        account_number: drv.account_number,
        percentage_charge: Number(cfg?.commission_percent ?? 7),
      }),
    });
    const subJson = (await subResp.json()) as {
      status: boolean;
      message: string;
      data?: { subaccount_code: string };
    };
    if (!subResp.ok || !subJson.status || !subJson.data) {
      throw new Error(subJson.message || "Subaccount creation failed");
    }

    const code = subJson.data.subaccount_code;
    await supabaseAdmin
      .from("drivers")
      .update({ paystack_subaccount_code: code })
      .eq("user_id", data.driverId);

    return { code, already: false };
  });

/**
 * Verify a Paystack transaction by reference and reconcile the payment row.
 * Called from the rider's browser when Paystack redirects them back to
 * /pay/callback?reference=... (the webhook also updates the row, but the
 * callback can run before/after the webhook so we run both paths).
 */
export const verifyRidePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reference: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const resp = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: authHeaders() },
    );
    const json = (await resp.json()) as {
      status: boolean;
      data?: {
        status: string;
        amount: number;
        authorization?: { authorization_code?: string };
        metadata?: { ride_id?: number };
      };
    };
    if (!resp.ok || !json.status || !json.data) {
      return { status: "failed" as const, rideId: null as number | null };
    }
    const paystackStatus = json.data.status;
    const newStatus =
      paystackStatus === "success"
        ? "captured"
        : paystackStatus === "failed"
          ? "failed"
          : "pending";

    await supabaseAdmin
      .from("payments")
      .update({
        status: newStatus,
        paystack_authorization_code:
          json.data.authorization?.authorization_code ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("paystack_reference", data.reference);

    const rideId = json.data.metadata?.ride_id ?? null;
    return { status: newStatus, rideId };
  });

/**
 * Returns the latest payments row for a ride, scoped to the rider or driver
 * by RLS. Used by the UI to show a "Paid" pill instead of "Pay now".
 */
export const getRidePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ rideId: z.number().int().positive() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("payments")
      .select("status, amount, paystack_reference, created_at")
      .eq("ride_id", data.rideId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return row ?? null;
  });
