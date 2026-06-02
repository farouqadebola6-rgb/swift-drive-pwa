import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

export type PaystackBank = { name: string; code: string; slug: string };

/** List Nigerian banks from Paystack (canonical naming). */
export const listPaystackBanks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<PaystackBank[]> => {
    const resp = await fetch(
      `${PAYSTACK_BASE}/bank?country=nigeria&perPage=200`,
      { headers: authHeaders() },
    );
    const json = (await resp.json()) as {
      status: boolean;
      message?: string;
      data?: PaystackBank[];
    };
    if (!resp.ok || !json.status || !json.data) {
      throw new Error(json.message || "Failed to load banks");
    }
    return json.data.map((b) => ({ name: b.name, code: b.code, slug: b.slug }));
  });

/** Resolve a bank account number against a bank code; returns account name. */
export const resolveBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        account_number: z.string().regex(/^\d{10}$/, "10 digits"),
        bank_code: z.string().min(1).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const url = `${PAYSTACK_BASE}/bank/resolve?account_number=${data.account_number}&bank_code=${data.bank_code}`;
    const resp = await fetch(url, { headers: authHeaders() });
    const json = (await resp.json()) as {
      status: boolean;
      message?: string;
      data?: { account_number: string; account_name: string };
    };
    if (!resp.ok || !json.status || !json.data) {
      throw new Error(json.message || "Could not verify account");
    }
    return { account_name: json.data.account_name };
  });
