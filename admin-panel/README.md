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

For development over the local network, `next.config.mjs` allows the current admin-panel host `192.168.100.107` so the Next.js hot-reload WebSocket can connect. If the machine's LAN address changes, update `allowedDevOrigins` to the new hostname or IP and restart the dev server. Use the production `start` command for deployments; this allowlist only affects the development server.

## Data and access

- The panel reads `admin_orders`, `admin_bookings`, `admin_products`, and `admin_partners`; Supabase RLS and database functions remain the access boundary.
- The Lounge sourcing queue reads `lounge_directory_leads` for authorized staff only. Its 110 category records are private sourcing placeholders, not named businesses, published listings, or price quotes; the public Lounge directory remains limited to active business records.
- Role permissions are checked with `public.has_permission`. Order and appointment changes call `update_order_status` and `update_booking_status`; the app only confirms success after the RPC succeeds.
- Signed-in accounts can update their password from **Account settings**. Password changes require at least 12 characters and are applied through Supabase Auth.
- Currency amounts are converted from database minor units to TZS by dividing by 100.
- Records unavailable to the signed-in role appear empty or show a query error. No demo records are seeded.
- Team invitations and partner/product/stylist management are clearly marked unavailable where this shared schema does not expose a complete secure workflow. Role information is read-only.

Apply the shared migrations in `supabase/migrations` before using the app.
