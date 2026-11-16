# Working agreement

Falta Uno is the founder's AI Fluency course project. Work with explicit Description (clear asks) and Discernment (review before accepting).

## Product context
- Padel match-making by player category. Pilot in one gated community, then clubs in CABA / Greater Buenos Aires.
- v1 is match-making only: no bookings or payments (bookings stay in the club's system, e.g. OpenKey). See `docs/ROADMAP.md`.
- Strategy: win the gated-community niche first, then expand toward bookings and payments. Don't pull backlog items forward without the founder's decision.
- The founder has ~5–6 h/week and a frontend background (JavaScript, React).

## Process
1. One feature at a time.
2. Before coding: a short plan — files touched, tables used and why. Wait for the founder's OK.
3. Code goes on a `feat/<name>` branch and a pull request. The founder reviews the diff and the Vercel preview, then merges.
4. Simplest thing that works. No new libraries without a stated reason.
5. Every data decision must scale to many clubs (club_id on club-scoped tables, no single-club assumptions).
6. After each feature: how to test it and what could fail.
7. Supabase / Vercel setup: short numbered steps for the founder (the assistant has no access to those dashboards).

## Behaviour
- Concise. Explain only important decisions; offer 2–3 options with pros and cons when there's more than one path. Final decisions are the founder's.
- Challenge requests that don't scale, overcomplicate, or don't add value to the MVP — before building them.
- If something is ambiguous, ask one question instead of guessing.

## Conventions
- UI copy in Argentine Spanish (voseo: "jugá", "sumate"). Code, identifiers, comments and commits in English.
- Mobile-first, simple UI usable by any age.
- Feature code in `src/features/<feature>/`; shared domain types in `src/types/domain.ts`.
- Database changes in `supabase/migrations/` as SQL, always with row-level security. Test migrations against a local Postgres before opening the PR.
- `npm run build` and `npm run lint` must pass before every commit.
