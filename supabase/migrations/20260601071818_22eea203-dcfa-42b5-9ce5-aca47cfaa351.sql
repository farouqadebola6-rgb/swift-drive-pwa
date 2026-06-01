ALTER TABLE public.pricing_config ADD COLUMN IF NOT EXISTS whatsapp_group_jid text;

ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;

-- Payments: rider/driver/admin already read. Allow service_role to insert/update (used by server fns with supabaseAdmin).
-- service_role bypasses RLS but we keep grants explicit.
GRANT INSERT, UPDATE ON public.payments TO service_role;

-- Allow admins to insert/update payments via dashboard if ever needed
DROP POLICY IF EXISTS "Admin inserts payments" ON public.payments;
CREATE POLICY "Admin inserts payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin updates payments" ON public.payments;
CREATE POLICY "Admin updates payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));