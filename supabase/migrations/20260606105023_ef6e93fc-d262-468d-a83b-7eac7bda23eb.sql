
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

ALTER TABLE public.saved_places
  ADD COLUMN IF NOT EXISTS slot text CHECK (slot IN ('home','work','favorite'));
UPDATE public.saved_places SET slot = CASE
  WHEN lower(label) LIKE '%home%' THEN 'home'
  WHEN lower(label) LIKE '%work%' THEN 'work'
  ELSE 'favorite'
END WHERE slot IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS saved_places_user_slot_uniq
  ON public.saved_places(user_id, slot) WHERE slot IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.phone_verifications TO authenticated;
GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own phone verifications" ON public.phone_verifications;
CREATE POLICY "Users manage own phone verifications" ON public.phone_verifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_phone_verif_user ON public.phone_verifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id bigint REFERENCES public.rides(id) ON DELETE SET NULL,
  category text NOT NULL,
  description text NOT NULL,
  contact_phone text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.incident_reports TO authenticated;
GRANT ALL ON public.incident_reports TO service_role;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users create own incident reports" ON public.incident_reports;
CREATE POLICY "Users create own incident reports" ON public.incident_reports
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users read own incident reports" ON public.incident_reports;
CREATE POLICY "Users read own incident reports" ON public.incident_reports
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins read all incident reports" ON public.incident_reports;
CREATE POLICY "Admins read all incident reports" ON public.incident_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins update incident reports" ON public.incident_reports;
CREATE POLICY "Admins update incident reports" ON public.incident_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS incident_reports_set_updated_at ON public.incident_reports;
CREATE TRIGGER incident_reports_set_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Backfill share tokens for existing rides (bypass protect trigger)
ALTER TABLE public.rides DISABLE TRIGGER rides_protect_fields;
UPDATE public.rides SET share_token = encode(extensions.gen_random_bytes(16),'hex')
WHERE share_token IS NULL;
ALTER TABLE public.rides ENABLE TRIGGER rides_protect_fields;
ALTER TABLE public.rides ALTER COLUMN share_token SET DEFAULT encode(extensions.gen_random_bytes(16),'hex');
