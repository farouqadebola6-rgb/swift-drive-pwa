import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Paystack webhook. Paystack signs the raw body with HMAC-SHA512 using
 * your secret key and sends it in the `x-paystack-signature` header.
 *
 * We handle `charge.success` to mark the matching `payments` row as
 * successful. Other events are acknowledged so Paystack does not retry.
 */
export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const signature = request.headers.get("x-paystack-signature");
        const body = await request.text();
        if (!signature) return new Response("Missing signature", { status: 401 });

        const expected = createHmac("sha512", secret).update(body).digest("hex");
        const sigBuf = Buffer.from(signature, "hex");
        const expBuf = Buffer.from(expected, "hex");
        if (
          sigBuf.length !== expBuf.length ||
          !timingSafeEqual(sigBuf, expBuf)
        ) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          event?: string;
          data?: {
            reference?: string;
            status?: string;
            amount?: number;
            authorization?: { authorization_code?: string };
          };
        };
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const ref = payload?.data?.reference;
        if (payload.event === "charge.success" && ref) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "successful",
              paystack_authorization_code:
                payload.data?.authorization?.authorization_code ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("paystack_reference", ref);
        }

        return new Response("ok");
      },
    },
  },
});
