# Fashion Floor Admin

Expo SDK 52 · React Native · TypeScript.

## Run

Create a local `.env` file using `.env.example`, then start Expo:

```bash
npm install
npm run typecheck
npm start
```

The app requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Without either value, it stays in live-mode setup state; it has no demo credentials or fixture fallback. Sign in with an existing Supabase Auth email and password.

## Live data and access

The app reads the signed-in user's `profiles` and `user_roles` rows, then loads `admin_orders`, `admin_bookings`, `admin_products`, and `admin_partners`. Order and booking status changes call the `update_order_status` and `update_booking_status` RPCs. Reload records with pull-to-refresh; changes to the underlying orders, bookings, products, or partners tables trigger a refresh when realtime is available.

Screens are hidden according to the user's role. Row access and mutations must still be authorized by Supabase RLS and the database RPCs.
