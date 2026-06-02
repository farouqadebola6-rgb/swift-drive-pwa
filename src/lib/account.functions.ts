import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Deletes the signed-in user's account and all linked data.
 * Required by Google Play account-deletion policy.
 * - Cancels any active rides (cancellation reason: "account_deleted").
 * - Removes profile, user_roles, driver record (cash_debts kept for accounting).
 * - Deletes the auth user — sign-in immediately stops working.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Cancel any active rides where this user is rider or driver
    await supabaseAdmin
      .from("rides")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "account_deleted",
      })
      .in("status", ["pending", "in_progress", "driver_arrived", "started"])
      .or(`rider_id.eq.${userId},driver_id.eq.${userId}`);

    // Cascade-delete linked records (best effort, ignore not-found)
    await supabaseAdmin.from("drivers").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Finally remove the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
