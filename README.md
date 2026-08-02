# Garden Map

A yard-planning app: a to-scale SVG grid of your yard(s) where you place plants and structures, track elevation/water-flow/shade, and see plants render seasonally (bloom, dormancy, fall color) based on real attribute data.

Personal/family project (Zack + Kira), built as a future lead magnet.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Database | Supabase (Postgres, Auth, Realtime) |
| Auth | Supabase Auth — Google OAuth, gated by an email whitelist |
| Hosting | Vercel (auto-deploy on push to `main`) |

## Repository layout

```
garden-map/
├── app/                    Vite + React frontend (the deployed app)
├── docs/                   Spec, build plan, and design notes
├── scripts/                Python scripts for seeding the plant reference table
│                           (Perenual/Trefle/NC Extension scraping) + schema.sql
├── data/                   Scraped/imported plant data used by the seed scripts
└── supabase/               Supabase CLI config + numbered SQL migrations
```

See [docs/app-build-plan.md](docs/app-build-plan.md) for architecture decisions, database schema, and the current roadmap, and [docs/garden-mapper-spec.md](docs/garden-mapper-spec.md) for the original build spec.

## Getting started

Prerequisites: Node.js 18+, the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), and Docker (for local Supabase).

```bash
# install frontend dependencies
cd app
npm install

# set up environment variables
cp .env.local.example .env.local   # if present, otherwise create manually — see below
```

`app/.env.local` needs:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALLOWED_EMAILS=              # comma-separated allowlist for the auth gate
```

Run the frontend:

```bash
npm run dev        # start dev server
npm run build      # typecheck + production build
npm run lint        # eslint
```

### Database

Migrations live in `supabase/migrations/` and are the source of truth for schema — no manual dashboard edits.

```bash
supabase start      # local Postgres + Auth + Realtime stack
supabase db push    # apply migrations to the linked project
```

### Plant reference data

`scripts/` contains one-off Python importers used to seed the `plants` reference table (species/cultivar attributes) from Perenual, Trefle, and the NC Extension Plant Toolbox. These are seed/maintenance scripts, not part of the running app. See the docstring in each script for usage.

## Deployment

Connected to Vercel; pushes to `main` auto-deploy. Supabase env vars are injected via Vercel's native Supabase integration. Build config lives in [vercel.json](vercel.json).
