# Fashion Floor Admin

The Fashion Floor Boutique & Lounge administration app, built with Next.js 14, TypeScript, Tailwind CSS, Supabase Auth, and the shared Supabase database.

## Setup

Create `admin-panel/.env.local` with the public Supabase project URL and publishable key:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

Next.js only exposes the `NEXT_PUBLIC_` variables to this browser app. These variables must contain only the public URL and publishable key; never put a Supabase secret/service-role key in client-side environment variables.

Install dependencies and run the app from this directory:

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Open [http://localhost:3001](http://localhost:3001). Sign in with an existing Supabase email/password account that has an active row in `public.user_roles` and a matching `public.profiles` record. There are no demo credentials.

## Data and access

- The panel reads `admin_orders`, `admin_bookings`, `admin_products`, and `admin_partners`; Supabase RLS and database functions remain the access boundary.
- Role permissions are checked with `public.has_permission`. Order and appointment changes call `update_order_status` and `update_booking_status`; the app only confirms success after the RPC succeeds.
- Currency amounts are converted from database minor units to TZS by dividing by 100.
- Records unavailable to the signed-in role appear empty or show a query error. No demo records are seeded.
- Team invitations and partner/product/stylist management are clearly marked unavailable where this shared schema does not expose a complete secure workflow. Role information is read-only.

Apply the shared migrations in `supabase/migrations` before using the app.
