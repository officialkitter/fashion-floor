# Supabase backend

The initial migration creates the Fashion Floor catalog, brand/store directory, Lounge businesses, providers, reviews, and appointment booking schema. Row-level security is enabled throughout. The Lounge directory intake migration adds 110 private sourcing placeholders across 11 categories; it does not invent business identities, locations, public listings, prices, reviews, or appointments.

The catalog approval migration tracks product and service submissions separately from their public visibility. New and edited listings return to review and are hidden from public catalog views until an authorized Fashion Floor reviewer approves them. Product approval requires a description, category, price, photo URL, and available stock; service approval requires a description, price, duration, and business photo. Existing active listings with valid HTTP(S) product or business images remain approved. Active listings without a valid image are deactivated and returned to review until their photos and details are verified.

## Local setup

1. Install the Supabase CLI and Docker using the official Supabase local-development guide.
2. Run `supabase start` from the repository root.
3. Copy `.env.example` to `.env.local` and set the local URL and publishable key printed by the CLI.
4. Run `supabase db reset` to apply the migrations to the local database.
5. Start Expo with `npm start`.

The catalog client stays in preview mode unless `EXPO_PUBLIC_USE_MOCKS=false`. With mock mode disabled, configure both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; otherwise the client reports a configuration error instead of silently falling back to preview data.

## Production setup

The CLI is configured for project `iylafpnuvdabmydpomgo`. Authenticate with `supabase login`, then verify access with `supabase migration list --linked`. Apply pending migrations with `supabase db push --linked` after reviewing the diff. Configure the project URL and publishable key in each app's ignored `.env.local` file or deployment environment. The same public key works for Expo (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and Next.js (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Never put a secret/service-role key or database password in any client-exposed variable.

The first platform Owner must be assigned from the Supabase SQL editor after creating the account through Supabase Auth. Replace the email before running this one-time bootstrap:

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin'
from auth.users
where lower(email) = lower('owner@example.com')
on conflict (user_id) do update
set role = excluded.role, vendor_id = null, is_active = true;
```

Role capabilities are enforced in the database with row-level security and permission-checked RPC functions. Only platform administrators can approve or decline products and services. A change to a submitted product or service puts it back into review and removes it from public listings until approved again. Team invitations use the trusted `admin-invite-user` Edge Function; its service-role key stays server-side. Never place a service-role key in the app or browser.

The team-workflow migration adds departments and configurable access roles, with starter roles for catalog review, marketing coordination, store operations, service operations, finance, and customer care. Platform administrators can invite team members, assign departments and roles, and review partners, stores, service businesses, and brand evidence. Only a platform Owner can grant or modify the Owner role.

The customer app reads the approved product and Lounge directory views. Signed-in customers can view their own orders and bookings, and Lounge appointment confirmation calls the authenticated `reserve_service_slot` RPC. The admin clients read the protected order, booking, product, service, and partner views. There are no seeded orders, bookings, or reviews. Seeded catalog entries are private planning drafts; they are not confirmed merchandise, supplier prices, or inventory. Payment processing, customer order submission, and business onboarding still require their own flows and a live Supabase project. Appointment reservations and admin status changes are exposed as authenticated, transactional RPCs; screens must call them before reporting a change as successful.

After applying migrations, the Fashion Floor Point catalog seed can be loaded once with `supabase db query --remote --file supabase/seeds/fashion_floor_point_catalog.sql`. It creates 120 unpublished product records across 12 brand names and 10 categories, plus 10 unpublished styling-service drafts. These entries are sourcing/planning records, not confirmed brand partnerships or live inventory: each product has no image, an unconfirmed indicative TZS price, zero on-hand quantity, and a stock target of 10. Services also have unconfirmed indicative prices. Do not approve or publish them until Fashion Floor Point has supplied authentic product photos, brand authorization, final prices, and physically received stock; confirm providers, locations, and service details before opening bookings. If the seed is run before the team-workflow migration or the Fashion Floor Point store is absent, it will fail rather than create a duplicate store.

The listing media migration provisions a public `product-media` bucket for JPEG, PNG, WebP, or AVIF images up to 5 MB each. Signed-in catalog managers and partner owners can upload product photos; suppliers and providers can edit only their own store/provider information, including an official source URL, address, description, and photo. Each listing edit returns the product, service, store, or provider record to review. Price confirmation, brand authorization, approved partner/store/provider status, required images, descriptions, and physically available stock remain mandatory before publication.

The admin catalog accepts `.xlsx` spreadsheets with one product per row and provides a downloadable template. Required columns are `brand_name`, `title`, `description`, `category`, `price`, and `stock_by_size`; optional columns are `currency`, `original_price`, `colors`, and `image_urls`. Prices use major currency units; stock uses `XS:2 | S:4` format with physically counted quantities; image URLs are separated by `|`. Each upload is limited to 250 rows and creates unpublished drafts with unconfirmed prices. Importing an unknown brand creates a pending, inactive brand record; never treat it as an approved brand relationship. Reports can be filtered by period and printed from the Reports section.

The landing page uses only public catalog views and should show an unconfigured/empty state until a project contains approved listings. To make the platforms live together, apply every migration to the same Supabase project and configure that project's public URL and publishable key in each app's own build environment.
