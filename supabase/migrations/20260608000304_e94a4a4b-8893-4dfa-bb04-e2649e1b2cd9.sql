
-- 1) Phone normalization helper
CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE p text;
BEGIN
  IF _phone IS NULL THEN RETURN NULL; END IF;
  p := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF p = '' THEN RETURN NULL; END IF;
  IF left(p, 2) = '00' THEN p := substring(p from 3); END IF;
  IF length(p) = 11 AND left(p,1) = '0' THEN p := '234' || substring(p from 2); END IF;
  IF length(p) = 10 AND left(p,1) IN ('7','8','9') THEN p := '234' || p; END IF;
  RETURN p;
END;
$$;

-- 2) Trigger to normalize on save
CREATE OR REPLACE FUNCTION public.tg_profiles_normalize_phone()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.phone := NULLIF(public.normalize_phone(NEW.phone), '');
  NEW.emergency_contact_phone := NULLIF(public.normalize_phone(NEW.emergency_contact_phone), '');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_normalize_phone ON public.profiles;
CREATE TRIGGER profiles_normalize_phone BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_normalize_phone();

-- 3) Backfill existing rows
UPDATE public.profiles SET phone = NULLIF(public.normalize_phone(phone), '') WHERE phone IS NOT NULL;
UPDATE public.profiles SET emergency_contact_phone = NULLIF(public.normalize_phone(emergency_contact_phone), '') WHERE emergency_contact_phone IS NOT NULL;

-- 4) Resolve dup phones by clearing newer duplicates so the unique index can build
WITH dups AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at, id) rn
  FROM public.profiles WHERE phone IS NOT NULL
)
UPDATE public.profiles p SET phone = NULL FROM dups WHERE dups.id = p.id AND dups.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (phone) WHERE phone IS NOT NULL;

-- 5) SOS sessions for live tracking
CREATE TABLE IF NOT EXISTS public.sos_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id BIGINT REFERENCES public.rides(id) ON DELETE SET NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','stopped','resolved')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  initial_lat NUMERIC,
  initial_lng NUMERIC,
  last_lat NUMERIC,
  last_lng NUMERIC,
  last_ping_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  stopped_by UUID REFERENCES auth.users(id),
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.sos_sessions TO authenticated;
GRANT ALL ON public.sos_sessions TO service_role;

ALTER TABLE public.sos_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners and admins read sos" ON public.sos_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owners insert own sos" ON public.sos_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owners or admins update sos" ON public.sos_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sos_sessions_set_updated_at BEFORE UPDATE ON public.sos_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS sos_sessions_active_idx ON public.sos_sessions (status, started_at DESC);
