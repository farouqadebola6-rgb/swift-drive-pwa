
-- 1) Atomic accept_ride
CREATE OR REPLACE FUNCTION public.accept_ride(p_ride_id BIGINT)
RETURNS public.rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_driver public.drivers;
  v_ride public.rides;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a driver';
  END IF;
  IF v_driver.verification_status NOT IN ('verified_digital','verified_physical') THEN
    RAISE EXCEPTION 'Driver not verified';
  END IF;
  IF v_driver.total_cash_debt > 0 AND v_driver.debt_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Driver locked due to unsettled cash debt';
  END IF;

  UPDATE public.rides
     SET driver_id = v_uid,
         status = 'in_progress',
         accepted_at = now(),
         updated_at = now()
   WHERE id = p_ride_id
     AND status = 'pending'
     AND driver_id IS NULL
  RETURNING * INTO v_ride;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride no longer available';
  END IF;

  RETURN v_ride;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_ride(BIGINT) TO authenticated;

-- 2) Complete ride — calculates final fare, records cash debt
CREATE OR REPLACE FUNCTION public.complete_ride(
  p_ride_id BIGINT,
  p_actual_distance_km NUMERIC,
  p_actual_duration_min NUMERIC
) RETURNS public.rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ride public.rides;
  v_cfg public.pricing_config;
  v_raw NUMERIC;
  v_final NUMERIC;
  v_commission NUMERIC;
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

  v_raw := v_cfg.base_fare
         + COALESCE(p_actual_distance_km, v_ride.estimated_distance_km, 0) * v_cfg.per_km_rate
         + COALESCE(p_actual_duration_min, v_ride.estimated_duration_min, 0) * v_cfg.per_minute_rate;
  v_final := CEIL(v_raw / 50.0) * 50;
  v_commission := ROUND(v_final * v_cfg.commission_percent / 100.0, 2);

  UPDATE public.rides
     SET status = 'completed',
         actual_distance_km = p_actual_distance_km,
         actual_duration_min = p_actual_duration_min,
         final_fare = v_final,
         trip_end_time = COALESCE(trip_end_time, now()),
         updated_at = now()
   WHERE id = p_ride_id
  RETURNING * INTO v_ride;

  -- If cash, the driver owes the platform its commission
  IF v_ride.payment_method = 'cash' THEN
    INSERT INTO public.cash_debts (ride_id, driver_id, amount_owed)
    VALUES (p_ride_id, v_uid, v_commission);
  END IF;

  RETURN v_ride;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_ride(BIGINT, NUMERIC, NUMERIC) TO authenticated;

-- 3) Mark arrived / start
CREATE OR REPLACE FUNCTION public.mark_ride_status(p_ride_id BIGINT, p_status public.ride_status)
RETURNS public.rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ride public.rides;
BEGIN
  IF p_status NOT IN ('driver_arrived','started') THEN
    RAISE EXCEPTION 'Invalid status transition';
  END IF;
  UPDATE public.rides
     SET status = p_status,
         arrived_at = CASE WHEN p_status='driver_arrived' THEN now() ELSE arrived_at END,
         trip_start_time = CASE WHEN p_status='started' THEN now() ELSE trip_start_time END,
         updated_at = now()
   WHERE id = p_ride_id AND driver_id = v_uid
  RETURNING * INTO v_ride;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not your ride'; END IF;
  RETURN v_ride;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_ride_status(BIGINT, public.ride_status) TO authenticated;

-- 4) Trigger to keep drivers.total_cash_debt in sync
CREATE OR REPLACE FUNCTION public.tg_sync_driver_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID := COALESCE(NEW.driver_id, OLD.driver_id);
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount_owed),0) INTO v_total
    FROM public.cash_debts
   WHERE driver_id = v_driver_id AND settled = false;
  UPDATE public.drivers
     SET total_cash_debt = v_total,
         updated_at = now()
   WHERE user_id = v_driver_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_debts_sync ON public.cash_debts;
CREATE TRIGGER trg_cash_debts_sync
AFTER INSERT OR UPDATE OR DELETE ON public.cash_debts
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_driver_debt();

-- 5) Allow drivers to read pending unassigned rides (dispatch pool)
CREATE POLICY "Verified drivers read pending pool"
ON public.rides
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND driver_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.drivers d
     WHERE d.user_id = auth.uid()
       AND d.verification_status IN ('verified_digital','verified_physical')
  )
);
