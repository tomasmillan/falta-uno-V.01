# Falta Uno

Padel match-making for clubs and gated communities in Argentina. Players find the fourth player of their level ("falta uno" = "we're one short"), join matches in one tap and share them on WhatsApp. Clubs get a clear view of their courts and, later, tournaments, bookings and payments.

**Status:** v0.1 in progress — match-making pilot in one gated community (country) in Buenos Aires.

## Stack

| Layer | Tool |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router |
| Backend | Supabase (Postgres, Auth, Realtime) |
| Hosting | Vercel |
| Mobile (later) | Capacitor wrapper for App Store / Google Play |

## Getting started

Requirements: Node.js 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm run dev                  # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run lint` | Lint with ESLint |
| `npm run preview` | Serve the production build locally |

## Project structure

```
src/
  app/          App shell, routes and top-level pages
  features/     One folder per feature (auth, profile, matches), each owning its components and data access
  lib/          Shared clients and helpers (Supabase client)
  types/        Domain types shared across features
  styles/       Global styles and design tokens
supabase/
  migrations/   SQL migrations for the database schema and row-level security
docs/           Product roadmap and decisions
```

## Conventions

- **Language:** UI copy in Argentine Spanish (voseo: "armá", "sumate"). Code, identifiers, comments and commits in English.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- **Branches:** `main` is always deployable. Work on `feat/<short-name>` branches and merge via pull request.
- **Secrets:** never commit `.env.local`. Only the Supabase *anon* key goes in the frontend; access is enforced with row-level security.
- **Versions:** tagged as `v0.1.0`, `v0.2.0`… See `docs/ROADMAP.md`.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
