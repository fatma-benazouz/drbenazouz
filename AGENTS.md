# Agent notes

- `main` is the production branch and is pushed to GitHub. Don't force-push or
  rewrite commits that are already pushed, and keep `main` buildable
  (`bun run build`).
- The app runs on Cloudflare Workers. `@react-pdf/renderer` is stubbed out of the
  server bundle in `vite.config.ts` to stay under the Worker size limit — keep
  PDF code in client-only routes/components.
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, which already
  registers TanStack Start, React, Tailwind, tsconfig paths and Nitro. Don't add
  those plugins again.
- Practice contact details and service copy live in `src/lib/site.ts`; change
  them there rather than hard-coding them in pages.
- The Supabase database was created by Lovable and is still the live database.
  Some tables (the invoicing ones) aren't fully described by the migrations in
  this repo, so check the live schema before changing queries against them.
- Never commit `.env`.
