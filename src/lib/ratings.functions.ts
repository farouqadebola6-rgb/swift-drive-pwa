import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyRatingSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("ratings")
      .select("score")
      .eq("driver_id", userId);
    if (error) throw new Error(error.message);
    const count = data?.length ?? 0;
    const avg =
      count > 0 ? data.reduce((s, r) => s + Number(r.score), 0) / count : 0;
    return { avg: Number(avg.toFixed(2)), count };
  });

export const getUserRatingSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("ratings")
      .select("score")
      .eq("driver_id", data.userId);
    if (error) throw new Error(error.message);
    const count = rows?.length ?? 0;
    const avg =
      count > 0 ? rows.reduce((s, r) => s + Number(r.score), 0) / count : 0;
    return { avg: Number(avg.toFixed(2)), count };
  });
