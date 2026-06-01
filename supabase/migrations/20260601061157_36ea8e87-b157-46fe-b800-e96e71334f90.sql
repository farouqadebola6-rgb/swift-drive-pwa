-- Fix 1: Bound driver-supplied actuals in complete_ride to prevent fare inflation
CREATE OR REPLACE FUNCTION public.complete_ride(p_ride_id bigint, p_actual_distance_km numeric, p_actual_duration_min numeric)
 RETURNS rides
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_ride public.rides;
  v_cfg public.pricing_config;
  v_raw NUMERIC;
  v_final NUMERIC;
  v_commission NUMERIC;
  v_dist NUMERIC;
  v_dur NUMERIC;
  v_max_dist NUMERIC;
  v_max_dur NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF v_ride.driver_id <> v_uid THEN RAISE EXCEPTION 'Not your ride'; END IF;
  IF v_ride.status NOT IN ('started','in_progress','driver_arrived') THEN
    RAISE EXCEPTION 'Ride not in completable state';
  END IF;

  SELECT * INTO v_cfg FROM public.pricing_config WHERE id = 1;

  -- Sanity bounds: actuals cannot exceed 3x estimate (or hard caps if no estimate)
  v_max_dist := GREATEST(COALESCE(v_ride.estimated_distance_km, 0) * 3, 5);
  v_max_dur  := GREATEST(COALESCE(v_ride.estimated_duration_min, 0) * 3, 15);

  IF p_actual_distance_km IS NULL OR p_actual_distance_km < 0 OR p_actual_distance_km > LEAST(v_max_dist, 500) THEN
    v_dist := COALESCE(v_ride.estimated_distance_km, 0);
  ELSE
    v_dist := p_actual_distance_km;
  END IF;

  IF p_actual_duration_min IS NULL OR p_actual_duration_min < 0 OR p_actual_duration_min > LEAST(v_max_dur, 600) THEN
    v_dur := COALESCE(v_ride.estimated_duration_min, 0);
  ELSE
    v_dur := p_actual_duration_min;
  END IF;

  v_raw := v_cfg.base_fare + v_dist * v_cfg.per_km_rate + v_dur * v_cfg.per_minute_rate;
  v_final := CEIL(v_raw / 50.0) * 50;
  v_commission := ROUND(v_final * v_cfg.commission_percent / 100.0, 2);

  UPDATE public.rides
     SET status = 'completed',
         actual_distance_km = v_dist,
         actual_duration_min = v_dur,
         final_fare = v_final,
         trip_end_time = COALESCE(trip_end_time, now()),
         updated_at = now()
   WHERE id = p_ride_id
  RETURNING * INTO v_ride;

  IF v_ride.payment_method = 'cash' THEN
    INSERT INTO public.cash_debts (ride_id, driver_id, amount_owed)
    VALUES (p_ride_id, v_uid, v_commission);
  END IF;

  RETURN v_ride;
END;
$function$;

-- Fix 2: Tighten rides UPDATE policies with WITH CHECK clauses for defense-in-depth.
-- The tg_rides_protect_fields trigger already blocks unauthorized column writes,
-- but adding WITH CHECK ensures RLS itself enforces ownership post-update.
DROP POLICY IF EXISTS "Rider updates own rides" ON public.rides;
CREATE POLICY "Rider updates own rides"
  ON public.rides
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = rider_id)
  WITH CHECK (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Driver updates assigned rides" ON public.rides;
CREATE POLICY "Driver updates assigned rides"
  ON public.rides
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id OR (status = 'pending' AND driver_id IS NULL
         AND EXISTS (SELECT 1 FROM public.drivers d
                     WHERE d.user_id = auth.uid()
                       AND d.verification_status IN ('verified_digital','verified_physical'))))
  WITH CHECK (auth.uid() = driver_id);

-- Ensure the field-protection trigger is attached (defense in depth)
DROP TRIGGER IF EXISTS rides_protect_fields ON public.rides;
CREATE TRIGGER rides_protect_fields
  BEFORE UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_rides_protect_fields();
