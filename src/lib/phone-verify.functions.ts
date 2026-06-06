import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normalizePhone(raw: string): string {
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) {
    // assume Nigeria if 11-digit local starting with 0
    if (/^0\d{10}$/.test(p)) p = "+234" + p.slice(1);
    else p = "+" + p;
  }
  return p;
}

function jidFor(phone: string): string {
  return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
}

function hashCode(code: string, phone: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export const requestPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ phone: z.string().min(7).max(20) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const phone = normalizePhone(data.phone);
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const code_hash = hashCode(code, phone);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error } = await supabaseAdmin.from("phone_verifications").insert({
      user_id: userId,
      phone,
      code_hash,
      expires_at,
    });
    if (error) throw new Error(error.message);

    const url = process.env.WHATSAPP_DISPATCH_URL;
    const token = process.env.WHATSAPP_DISPATCH_TOKEN;
    if (!url || !token) {
      return { ok: false, reason: "dispatcher_not_configured" as const };
    }
    const text = `Hamduk Drive verification code: ${code}\n\nThis code expires in 10 minutes. If you didn't request it, ignore this message.`;
    const resp = await fetch(`${url.replace(/\/$/, "")}/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jid: jidFor(phone), text }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { ok: false, reason: t.slice(0, 200) };
    }
    return { ok: true, phone };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        phone: z.string().min(7).max(20),
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const phone = normalizePhone(data.phone);
    const code_hash = hashCode(data.code, phone);

    const { data: row, error } = await supabaseAdmin
      .from("phone_verifications")
      .select("id, code_hash, expires_at, attempts, verified_at")
      .eq("user_id", userId)
      .eq("phone", phone)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("No active code. Request a new one.");
    if (new Date(row.expires_at).getTime() < Date.now())
      throw new Error("Code expired. Request a new one.");
    if (row.attempts >= 5) throw new Error("Too many attempts.");

    if (row.code_hash !== code_hash) {
      await supabaseAdmin
        .from("phone_verifications")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Incorrect code.");
    }

    await supabaseAdmin
      .from("phone_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", row.id);
    await supabaseAdmin
      .from("profiles")
      .update({ phone, phone_verified_at: new Date().toISOString() })
      .eq("id", userId);
    return { ok: true, phone };
  });
