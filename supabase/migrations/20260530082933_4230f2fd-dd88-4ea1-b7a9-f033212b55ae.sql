-- Fix 1: Restrict driver self-updates to non-sensitive fields
DROP POLICY IF EXISTS "Driver updates own record (non-verification fields)" ON public.drivers;

CREATE OR REPLACE FUNCTION public.tg_drivers_protect_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
     OR NEW.debt_locked_at IS DISTINCT FROM OLD.debt_locked_at
     OR NEW.total_cash_debt IS DISTINCT FROM OLD.total_cash_debt
     OR NEW.badge_type IS DISTINCT FROM OLD.badge_type
     OR NEW.paystack_subaccount_code IS DISTINCT FROM OLD.paystack_subaccount_code
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed to change protected driver fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drivers_protect_admin_fields ON public.drivers;
CREATE TRIGGER drivers_protect_admin_fields
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.tg_drivers_protect_admin_fields();

CREATE POLICY "Driver updates own record"
  ON public.drivers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix 2 & 3: Restrict ride updates by driver/rider via trigger
CREATE OR REPLACE FUNCTION public.tg_rides_protect_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Driver constraints
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

  -- Rider constraints: only cancellation
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
$$;

DROP TRIGGER IF EXISTS rides_protect_fields ON public.rides;
CREATE TRIGGER rides_protect_fields
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.tg_rides_protect_fields();

-- Fix 4: Sensitive driver fields exposed to matched riders
DROP POLICY IF EXISTS "Rider reads matched driver" ON public.drivers;

CREATE OR REPLACE VIEW public.matched_driver_public
WITH (security_invoker = true) AS
SELECT d.user_id,
       d.vehicle_make,
       d.vehicle_model,
       d.vehicle_colour,
       d.plate_number,
       d.vehicle_photo_url,
       d.badge_type,
       d.verification_status
FROM public.drivers d
WHERE EXISTS (
  SELECT 1 FROM public.rides r
   WHERE r.driver_id = d.user_id AND r.rider_id = auth.uid()
);

GRANT SELECT ON public.matched_driver_public TO authenticated;

-- Fix 5: Explicit deny on payments writes for non-admin (defense in depth)
-- Already default-deny; lock down EXECUTE on SECURITY DEFINER functions

-- Fix 6 & 7: Revoke broad EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_ride(bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_ride(bigint, numeric, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.mark_ride_status(bigint, public.ride_status) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_ride(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_ride(bigint, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_ride_status(bigint, public.ride_status) TO authenticated, service_role;
