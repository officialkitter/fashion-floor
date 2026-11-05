# Fashion Floor backend database access

This workspace is the server-only home for Prisma. Mobile and browser clients must continue to use Supabase Auth and the publishable key; never import Prisma into those clients or expose either Postgres connection URL to them.

## Setup

Use Node.js 24 or newer. Copy `.env.example` to `.env` and replace `[URL-ENCODED-PASSWORD]` with the percent-encoded Supabase database password. Keep `.env` local; Git ignores it.

```powershell
npm install
npx prisma db pull
npm run db:generate
npm run typecheck
npm run db:check
```

`DATABASE_URL` uses Supavisor transaction mode for the long-running backend client. `DIRECT_URL` uses session mode for Prisma CLI introspection. Both use the project-specific Supavisor username and the `eu-west-1` endpoint. Prisma introspects the SQL schema managed by `supabase/migrations`; do not use Prisma Migrate to duplicate or replace those migrations.

`db:validate` validates the Prisma schema. `db:check` builds the backend and verifies that the generated Prisma Client can connect. It reports record counts, not customer data.

The Lounge intake migration creates 110 private sourcing placeholders across 11 categories. These are not verified businesses or public directory listings; names, locations, source links, and published prices remain empty until confirmed from a reliable source.

## Catalog records

`npm run seed:catalog -- --dry-run` validates the 120-entry brand assortment without connecting to or changing the database. `npm run seed:catalog` requires an active `super_admin` account. It creates one inactive store named `Fashion Floor Point`, 12 brand records, and 120 inactive products with TZS reference estimates, no stock, no discounts, and no fabricated reviews. Brand affiliation and product authenticity stay unverified; review supplier evidence before publication. The command is idempotent for product IDs and will not overwrite existing brand records.

## Schema ownership

The canonical schema and data security rules remain in `../supabase/migrations`. After a SQL migration changes the schema, run `npm run db:pull` and `npm run db:generate` here so Prisma types stay aligned. The supplied database login is privileged and bypasses RLS. Prisma must stay server-only; any future API endpoint using it must authenticate the caller and enforce record-level permissions explicitly. Keep customer-scoped operations on Supabase Auth/RLS clients and permission-checked RPCs. The Prisma health check and catalog seed are trusted maintenance commands, not public API handlers.
