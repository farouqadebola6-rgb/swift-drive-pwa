## Scope

Fix 9 bugs/UX issues across the Hamduk Drive app and provide a detailed spec for the custom Baileys WhatsApp microservice.

---

## 1. Paystack paid-state UI
**Files**: `src/components/rider/active-ride.tsx`, `src/lib/paystack.functions.ts`
- Add `getRidePaymentStatus` server fn that returns the latest `payments` row for a ride.
- In `ActiveRide`, query payment status; if `status='success'` (or `paid_at` set), replace the "Pay online" button with a disabled gray "Paid ✓" pill. Hide cash instructions when paid.

## 2. Real rider/driver ratings
**Files**: new `src/lib/ratings.functions.ts`, `src/routes/_authenticated/profile.tsx`, driver/rider profile cards
- Server fn `getMyRatingSummary` → `SELECT avg(score), count(*) FROM ratings WHERE ratee_id = auth.uid()`.
- Render stars + count on Profile page. Replace any hardcoded "5.0" with live value, fallback to "New" when count = 0.

## 3. Driver details on rider screen when accepted
**Files**: `src/components/rider/active-ride.tsx`
- Extend the active-ride query to join driver profile + driver record (`full_name`, `phone`, `vehicle_make`, `vehicle_model`, `vehicle_plate`, `vehicle_color`, avatar, avg rating).
- Render a Bolt/Uber-style card once `status` is in `('in_progress','driver_arrived','started')`: avatar, name, rating, vehicle plate + model/color, Call button (`tel:` link), WhatsApp button.

## 4. Dynamic driver dashboard KPIs
**Files**: `src/components/dashboards/driver-home.tsx`
- Replace static numbers with React Query calls:
  - Today's trips: `count(rides where driver_id=me AND completed_at::date = today)`
  - Today's earnings: `sum(final_fare*(1-commission%)) ... completed today`
  - Acceptance rate: completed / (completed + cancelled by driver) over 30d
  - Outstanding cash debt: from `drivers.total_cash_debt`
  - Avg rating: from ratings join

## 5. Remove geo search restriction
**File**: `src/lib/geo.ts`
- Drop `viewbox` + `bounded=1` + `countrycodes=ng`; keep the Lagos bias only as a soft `q` suffix and let Nominatim return anything. Bump `limit` to 8.

## 6. "Use my location" pickup button
**Files**: `src/components/booking/location-autocomplete.tsx` (add optional `showLocateButton`), `src/components/booking/booking-flow.tsx`
- Adds a button beside the pickup input. Uses `navigator.geolocation.getCurrentPosition`, reverse-geocodes via Nominatim `/reverse`, sets pickup.

## 7. Saved Places redesign (Home/Work/Favorite, map-searched)
**Files**: `src/routes/_authenticated/saved-places.tsx`, new `SavedPlacePicker`, migration to add `lat/lng` columns + a `slot` enum
- Migration: add `slot text check in ('home','work','favorite')`, `lat numeric`, `lng numeric`, unique `(user_id, slot)`. Backfill existing rows with `slot='favorite'`.
- UI shows three fixed cards (Home / Work / Favorite). Tapping one opens a `LocationAutocomplete` modal to pick the place via the same search used in booking. Saves geo coords.
- Booking flow: when focusing pickup/destination inputs, show saved places as a dropdown above the search results; selecting one fills the field with the saved GeoPlace.

## 8. WhatsApp OTP phone verification
**Files**: new `src/lib/phone-verify.functions.ts`, edits to driver onboarding + profile phone update
- `requestPhoneOtp({ phone })` → calls Baileys `/otp/send`, stores hashed OTP + expiry in new `phone_verifications` table.
- `verifyPhoneOtp({ phone, code })` → checks hash, marks `profiles.phone_verified_at`.
- UI: phone input → "Send code" → OTP 6-digit input → "Verify". Block saving phone until verified.

## 9. SOS + Share Trip + Report Incident
**Migration**: add `emergency_contact_name`, `emergency_contact_phone` to `profiles`; create `incident_reports` table.
**Files**: `src/components/rider/active-ride.tsx`, `src/components/driver/ride-flow.tsx`, `src/routes/_authenticated/safety.tsx`, `src/routes/support.tsx`, new `src/lib/safety.functions.ts`
- SOS button (rider + driver during active ride): `tel:112` + server fn `triggerSos({ rideId, lat, lng })` which posts to Baileys with ride summary + live coords to user's emergency contact.
- Share Trip button (during active ride): server fn `shareTrip({ rideId, lat, lng })` sends a WhatsApp message with a link `https://swift-drive-pwa.lovable.app/trip/<token>` (public read-only trip page) — minimal public route `src/routes/trip.$token.tsx` showing pickup/drop/status/driver name/plate.
- Safety page: surface Emergency Contact form (uses Supabase update).
- Support page: add Report Incident form → inserts into `incident_reports` and notifies admins.

## 10. Baileys microservice spec
Delivered in chat as a detailed README-style spec (endpoints, auth, queueing, persistence, error semantics).

---

## Technical notes

- All new server fns use `requireSupabaseAuth`; OTP + SOS + share-trip endpoints call Baileys via existing `WHATSAPP_DISPATCH_URL` + `WHATSAPP_DISPATCH_TOKEN`.
- New tables: `phone_verifications`, `incident_reports`; new columns: `profiles.emergency_contact_*`, `profiles.phone_verified_at`, `saved_places.{slot,lat,lng}`. Every new public table gets GRANT + RLS.
- The driver-fields trigger already allows `total_cash_debt`; verify it also allows `emergency_contact_*` on profiles (profiles trigger is separate / none today).
- Public trip page uses an unguessable `share_token` (uuid) stored on `rides`; only minimal fields exposed.

## Out of scope

- Push notifications (web push) — kept on existing in-app notifications table.
- Actual deployment of the Baileys service (spec only; user runs it themselves).
