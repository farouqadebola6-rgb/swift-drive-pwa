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
       OR NEW.estimated_distance_km IS DISTINCT FROM OLD.estimated_distance_km
       OR NEW.estimated_duration_min IS DISTINCT FROM OLD.estimated_duration_min THEN
      RAISE EXCEPTION 'Drivers cannot modify these fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      -- Allowed driver-initiated status transitions
      IF (OLD.status = 'in_progress'   AND NEW.status = 'driver_arrived')
         OR (OLD.status = 'driver_arrived' AND NEW.status = 'started')
         OR (OLD.status IN ('started','in_progress','driver_arrived') AND NEW.status = 'completed')
         OR (OLD.status IN ('in_progress','driver_arrived','started') AND NEW.status = 'cancelled') THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Invalid driver status transition';
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