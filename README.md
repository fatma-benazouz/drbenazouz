# Dr Ben Azouz — Corporate Metabolic Clinic

Website and practice-management app for Dr Ben Azouz's general practice at
135 Daisy St, Sandown, Sandton, Johannesburg.

- **Public site** — home, about, services (one page per service), contact and
  privacy pages, plus online booking.
- **Admin dashboard** (`/admin`, admin role required) — booking inbox, calendar,
  availability, patients, contacts and invoicing with PDF export.

## Built with

- [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router & Query), TypeScript
- Tailwind CSS v4 and shadcn/ui
- Supabase (Postgres, auth, row-level security)
- Deployed to Cloudflare Workers via Nitro and Wrangler

## Development

Requires [Bun](https://bun.sh) (or Node.js with npm).

```sh
bun install
bun run dev
```

Create a `.env` file in the project root with the Supabase project's details:

```sh
SUPABASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

`.env` is git-ignored — never commit it.

## Build and deploy

```sh
bun run build
npx nitro deploy --prebuilt
```

The build writes a Cloudflare Worker to `.output/`; the deploy step publishes it
with Wrangler.

## Where things live

| Path | What |
| --- | --- |
| `src/lib/site.ts` | Practice name, address, phone, email and all service copy |
| `src/routes/` | Pages (file-based routing) |
| `src/components/site/` | Header, footer, hero, CTA band, scroll-reveal animation |
| `src/components/booking/` | Booking flow |
| `src/components/admin/` | Admin dashboard tabs, invoices and PDF rendering |
| `src/lib/schedule.ts` | Slot generation (Africa/Johannesburg time) |
| `src/integrations/supabase/` | Supabase clients and auth middleware |
| `supabase/migrations/` | SQL migrations for bookings, availability and roles |

## Database

The Supabase schema was originally created by Lovable. `supabase/migrations/`
covers `user_roles`, `availability_rules`, `availability_exceptions` and
`bookings`; the invoicing tables (`patients`, `invoices`, `invoice_items`,
`practice_settings`) exist in the live database but are only partly captured in
`drizzle/migrations/`. The practice details printed on invoices come from the
`practice_settings` row, edited in the admin dashboard — not from `site.ts`.
