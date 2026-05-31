-- 1. Fix accept_ride authorization: allow assigning a NULL driver_id to self on a pending ride
CREATE OR REPLACE FUNCTION public.tg_rides_protect_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF public.has_role(v_uid, 'admin') THEN
    RETURN NEW;
  END IF;

  -- Immutable for everyone except admin
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.rider_id IS DISTINCT FROM OLD.rider_id
     OR NEW.acceptance_token IS DISTINCT FROM OLD.acceptance_token
     OR NEW.fare_estimate IS DISTINCT FROM OLD.fare_estimate
     OR NEW.pickup_lat IS DISTINCT FROM OLD.pickup_lat
     OR NEW.pickup_lng IS DISTINCT FROM OLD.pickup_lng
     OR NEW.destination_lat IS DISTINCT FROM OLD.destination_lat
     OR NEW.destination_lng IS DISTINCT FROM OLD.destination_lng
     OR NEW.pickup_address IS DISTINCT FROM OLD.pickup_address
     OR NEW.destination_address IS DISTINCT FROM OLD.destination_address
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
    RAISE EXCEPTION 'Field not editable';
  END IF;

  -- Driver accepting a pending ride: NULL -> self while status pending -> in_progress
  IF OLD.driver_id IS NULL
     AND NEW.driver_id = v_uid
     AND OLD.status = 'pending'
     AND NEW.status = 'in_progress' THEN
    RETURN NEW;
  END IF;

  -- Driver constraints (already-assigned driver)
  IF v_uid = OLD.driver_id THEN
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id
       OR NEW.final_fare IS DISTINCT FROM OLD.final_fare
       OR NEW.actual_distance_km IS DISTINCT FROM OLD.actual_distance_km
       OR NEW.actual_duration_min IS DISTINCT FROM OLD.actual_duration_min
       OR NEW.estimated_distance_km IS DISTINCT FROM OLD.estimated_distance_km
       OR NEW.estimated_duration_min IS DISTINCT FROM OLD.estimated_duration_min THEN
      RAISE EXCEPTION 'Drivers must use ride RPCs to change financial/status fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Drivers must use ride RPCs to change status';
    END IF;
    RETURN NEW;
  END IF;

  -- Rider constraints
  IF v_uid = OLD.rider_id THEN
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id
       OR NEW.final_fare IS DISTINCT FROM OLD.final_fare
       OR NEW.actual_distance_km IS DISTINCT FROM OLD.actual_distance_km
       OR NEW.actual_duration_min IS DISTINCT FROM OLD.actual_duration_min THEN
      RAISE EXCEPTION 'Riders cannot modify driver or financial fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status IN ('pending','in_progress','driver_arrived')
                AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'Riders can only cancel active rides';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update this ride';
END;
$function$;

-- Ensure the trigger is attached (was missing from listing)
DROP TRIGGER IF EXISTS rides_protect_fields ON public.rides;
CREATE TRIGGER rides_protect_fields
BEFORE UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.tg_rides_protect_fields();

-- Make sure protect-admin-fields trigger is attached on drivers
DROP TRIGGER IF EXISTS drivers_protect_admin_fields ON public.drivers;
CREATE TRIGGER drivers_protect_admin_fields
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.tg_drivers_protect_admin_fields();

-- Make sure cash_debts sync trigger is attached
DROP TRIGGER IF EXISTS cash_debts_sync_driver_debt ON public.cash_debts;
CREATE TRIGGER cash_debts_sync_driver_debt
AFTER INSERT OR UPDATE OR DELETE ON public.cash_debts
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_driver_debt();

-- Make sure updated_at trigger exists for drivers/rides/profiles
DROP TRIGGER IF EXISTS drivers_set_updated_at ON public.drivers;
CREATE TRIGGER drivers_set_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS rides_set_updated_at ON public.rides;
CREATE TRIGGER rides_set_updated_at
BEFORE UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- handle_new_user trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add comprehensive onboarding fields to drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS home_address text,
  ADD COLUMN IF NOT EXISTS nin text,
  ADD COLUMN IF NOT EXISTS drivers_license_number text,
  ADD COLUMN IF NOT EXISTS drivers_license_expiry date,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS vehicle_registration_number text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS insurance_doc_url text,
  ADD COLUMN IF NOT EXISTS vehicle_registration_doc_url text,
  ADD COLUMN IF NOT EXISTS onboarding_submitted_at timestamptz;

-- 3. Storage bucket for driver documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: drivers read/write own folder; admins read all
DROP POLICY IF EXISTS "Drivers read own documents" ON storage.objects;
CREATE POLICY "Drivers read own documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Drivers upload own documents" ON storage.objects;
CREATE POLICY "Drivers upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Drivers update own documents" ON storage.objects;
CREATE POLICY "Drivers update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Drivers delete own documents" ON storage.objects;
CREATE POLICY "Drivers delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins read all driver documents" ON storage.objects;
CREATE POLICY "Admins read all driver documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'driver-documents' AND public.has_role(auth.uid(), 'admin'));