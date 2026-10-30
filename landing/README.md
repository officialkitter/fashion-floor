# Fashion Floor landing page

Responsive Next.js landing page for Fashion Floor's Boutique + Lounge discovery app.

## Run locally

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

The public directory reads from the Supabase views `product_cards`, `lounge_stylists`, and `fashion_buildings`. Set these public environment variables to enable live listings and record counts:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

These are public client-side settings; never put a Supabase service-role key or other secret in this landing app. The views must allow public read access for the anon role. Without configuration the page says data is not connected; empty views show that no verified listings are available.

The landing page is informational. It does not submit partner applications, process bookings, or take payments.
