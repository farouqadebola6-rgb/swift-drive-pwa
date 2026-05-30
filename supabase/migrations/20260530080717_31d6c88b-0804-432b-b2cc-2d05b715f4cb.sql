
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('rider', 'driver', 'admin');
CREATE TYPE public.driver_verification_status AS ENUM ('pending', 'verified_digital', 'verified_physical', 'suspended');
CREATE TYPE public.driver_badge_type AS ENUM ('verified', 'physically_verified');
CREATE TYPE public.ride_status AS ENUM ('pending', 'in_progress', 'driver_arrived', 'started', 'completed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('online', 'cash');
CREATE TYPE public.payment_status AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES (separate table — security best practice) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer fn to check role without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ DRIVERS ============
CREATE TABLE public.drivers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_colour TEXT,
  plate_number TEXT,
  licence_url TEXT,
  vehicle_photo_url TEXT,
  bank_name TEXT,
  account_number TEXT,
  paystack_subaccount_code TEXT,
  verification_status public.driver_verification_status NOT NULL DEFAULT 'pending',
  badge_type public.driver_badge_type,
  suspension_reason TEXT,
  total_cash_debt NUMERIC(12,2) NOT NULL DEFAULT 0,
  debt_locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- ============ RIDES ============
CREATE TABLE public.rides (
  id BIGSERIAL PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  pickup_area TEXT NOT NULL,
  pickup_lat NUMERIC(10,7) NOT NULL,
  pickup_lng NUMERIC(10,7) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_area TEXT NOT NULL,
  destination_lat NUMERIC(10,7) NOT NULL,
  destination_lng NUMERIC(10,7) NOT NULL,
  estimated_distance_km NUMERIC(8,2),
  estimated_duration_min NUMERIC(8,2),
  fare_estimate NUMERIC(12,2) NOT NULL,
  final_fare NUMERIC(12,2),
  actual_distance_km NUMERIC(8,2),
  actual_duration_min NUMERIC(8,2),
  payment_method public.payment_method NOT NULL,
  status public.ride_status NOT NULL DEFAULT 'pending',
  acceptance_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  driver_pickup_lat NUMERIC(10,7),
  driver_pickup_lng NUMERIC(10,7),
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  trip_start_time TIMESTAMPTZ,
  trip_end_time TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rides_rider ON public.rides(rider_id, created_at DESC);
CREATE INDEX idx_rides_driver ON public.rides(driver_id, created_at DESC);
CREATE INDEX idx_rides_status ON public.rides(status);
GRANT SELECT, INSERT, UPDATE ON public.rides TO authenticated;
GRANT ALL ON public.rides TO service_role;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id BIGINT NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  paystack_reference TEXT,
  paystack_authorization_code TEXT,
  driver_split NUMERIC(12,2),
  platform_split NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_ride ON public.payments(ride_id);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============ CASH DEBTS ============
CREATE TABLE public.cash_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id BIGINT NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  amount_owed NUMERIC(12,2) NOT NULL,
  settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  settlement_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cash_debts_driver ON public.cash_debts(driver_id, settled);
GRANT SELECT, INSERT, UPDATE ON public.cash_debts TO authenticated;
GRANT ALL ON public.cash_debts TO service_role;
ALTER TABLE public.cash_debts ENABLE ROW LEVEL SECURITY;

-- ============ RATINGS ============
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id BIGINT NOT NULL UNIQUE REFERENCES public.rides(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- ============ DISPATCH LOGS ============
CREATE TABLE public.dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id BIGINT NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  message_body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT
);
GRANT SELECT ON public.dispatch_logs TO authenticated;
GRANT ALL ON public.dispatch_logs TO service_role;
ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;

-- ============ PRICING CONFIG ============
CREATE TABLE public.pricing_config (
  id INT PRIMARY KEY DEFAULT 1,
  base_fare NUMERIC(12,2) NOT NULL DEFAULT 500,
  per_km_rate NUMERIC(12,2) NOT NULL DEFAULT 150,
  per_minute_rate NUMERIC(12,2) NOT NULL DEFAULT 30,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pricing_singleton CHECK (id = 1)
);
INSERT INTO public.pricing_config (id) VALUES (1);
GRANT SELECT ON public.pricing_config TO anon, authenticated;
GRANT ALL ON public.pricing_config TO service_role;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers and riders read each other (matched ride)" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE (r.rider_id = auth.uid() AND r.driver_id = profiles.id)
       OR (r.driver_id = auth.uid() AND r.rider_id = profiles.id)
  )
);

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- drivers
CREATE POLICY "Driver reads own record" ON public.drivers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Driver inserts own record" ON public.drivers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Driver updates own record (non-verification fields)" ON public.drivers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin reads all drivers" ON public.drivers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates all drivers" ON public.drivers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Rider reads matched driver" ON public.drivers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rides r WHERE r.rider_id = auth.uid() AND r.driver_id = drivers.user_id)
);

-- rides
CREATE POLICY "Rider reads own rides" ON public.rides FOR SELECT TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Driver reads own rides" ON public.rides FOR SELECT TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Rider creates own rides" ON public.rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Rider updates own rides" ON public.rides FOR UPDATE TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Driver updates assigned rides" ON public.rides FOR UPDATE TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Admin reads all rides" ON public.rides FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates all rides" ON public.rides FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- payments
CREATE POLICY "Rider reads own payments" ON public.payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rides r WHERE r.id = payments.ride_id AND r.rider_id = auth.uid())
);
CREATE POLICY "Driver reads own payments" ON public.payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rides r WHERE r.id = payments.ride_id AND r.driver_id = auth.uid())
);
CREATE POLICY "Admin reads all payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- cash_debts
CREATE POLICY "Driver reads own debts" ON public.cash_debts FOR SELECT TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Admin reads all debts" ON public.cash_debts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin updates debts" ON public.cash_debts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ratings
CREATE POLICY "Rider creates rating for own ride" ON public.ratings FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = rider_id AND
  EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ratings.ride_id AND r.rider_id = auth.uid() AND r.status = 'completed')
);
CREATE POLICY "Rider reads own rating" ON public.ratings FOR SELECT TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Driver reads ratings about self" ON public.ratings FOR SELECT TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Admin reads all ratings" ON public.ratings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- dispatch_logs
CREATE POLICY "Admin reads dispatch logs" ON public.dispatch_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- pricing_config
CREATE POLICY "Anyone reads pricing" ON public.pricing_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin updates pricing" ON public.pricing_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS ============

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_rides_updated_at BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile + default 'rider' role on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_role_text TEXT;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone, '')
  );

  v_role_text := COALESCE(NEW.raw_user_meta_data ->> 'role', 'rider');
  IF v_role_text NOT IN ('rider', 'driver') THEN
    v_role_text := 'rider';
  END IF;
  v_role := v_role_text::public.app_role;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  -- Auto-create driver shell if signing up as driver
  IF v_role = 'driver' THEN
    INSERT INTO public.drivers (user_id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
