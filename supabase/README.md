# Supabase backend

The initial migration creates the Fashion Floor catalog, brand/store directory, Lounge businesses, providers, reviews, and appointment booking schema. Row-level security is enabled throughout. The Lounge directory intake migration adds 110 private sourcing placeholders across 11 categories; it does not invent business identities, locations, public listings, prices, reviews, or appointments.

## Local setup

1. Install the Supabase CLI and Docker using the official Supabase local-development guide.
2. Run `supabase start` from the repository root.
3. Copy `.env.example` to `.env.local` and set the local URL and publishable key printed by the CLI.
4. Run `supabase db reset` to apply the migrations to the local database.
5. Start Expo with `npm start`.

The catalog client stays in preview mode unless `EXPO_PUBLIC_USE_MOCKS=false`. With mock mode disabled, configure both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; otherwise the client reports a configuration error instead of silently falling back to preview data.

## Production setup

The CLI is configured for project `iylafpnuvdabmydpomgo`. Authenticate with `supabase login`, then link/verify the project and run `supabase db push` after providing the database password locally. Configure the project URL and publishable key in each app's ignored `.env.local` file or deployment environment. The same public key works for Expo (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and Next.js (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Never put a secret/service-role key or database password in any client-exposed variable.

The first platform Owner must be assigned from the Supabase SQL editor after creating the account through Supabase Auth. Replace the email before running this one-time bootstrap:

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin'
from auth.users
where lower(email) = lower('owner@example.com')
on conflict (user_id) do update
set role = excluded.role, vendor_id = null, is_active = true;
```

Role capabilities are enforced in the database with row-level security and permission-checked RPC functions. Admins can update approved records, but cannot create auth accounts from a mobile/web client; use Supabase's trusted admin invitation workflow to create each teammate's account before assigning a role. Never place a service-role key in the app or browser.

The customer app reads the product and Lounge directory views. Signed-in customers can view their own orders and bookings, and Lounge appointment confirmation calls the authenticated `reserve_service_slot` RPC. The admin clients read the protected order, booking, product, and partner views. There are no seeded merchants, orders, bookings, or reviews, so these screens show only records that have actually been added. Payment processing, customer order submission, and business onboarding still require their own flows and a live Supabase project. Appointment reservations and admin status changes are exposed as authenticated, transactional RPCs; screens must call them before reporting a change as successful.

The landing page uses only public catalog views and should show an unconfigured/empty state until a project contains approved listings. To make the platforms live together, apply both migrations to the same Supabase project and configure that project's public URL and publishable key in each app's own build environment.
