# Roadmap

## v0.1 — Match-making pilot (current)

Goal: neighbours in one gated community use it to complete their matches. Court booking stays in the community's existing system (OpenKey); Falta Uno makes sure the four players are confirmed before anyone books.

1. [x] Project base: React + TypeScript + Vite, folder structure, README
2. [ ] Accounts: Supabase project and Vercel deployment connected to this repo
3. [ ] Auth and profile: sign in with Google (email and other providers later); name, category (8va–1ra), preferred side, WhatsApp
4. [ ] Matches: create a match, list open matches with "Falta 1" badge, join and leave, live updates (Supabase Realtime)
5. [ ] Share and ship: "Share on WhatsApp" link per match; deployed URL tested with 3–4 players

Success: 10 real players, 5 matches completed through the app in the first two weeks.

## v0.2 — Club tools

- Court staff view: daily court agenda, move or cancel matches with player notifications
- Club admin: courts, users and roles
- Basic ranking from match results

## v0.3 — Tournaments

- Admin creates tournaments by category; pairs register
- Random single-elimination bracket with byes; results advance winners automatically

## v1.0 — Bookings and payments

- Court booking (own system or integration with the club's existing one)
- Payments via Mercado Pago, paid directly to the club; platform fee per booking / tournament
- Monthly subscription for clubs (B2B) and open marketplace for public courts (B2C)

## Later

- Native apps (Capacitor) on App Store and Google Play
- Expansion: more clubs in CABA and Greater Buenos Aires, then nationwide and Latin America

## Decisions log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-04 | v0.1 is match-making only, no bookings | Coexists with OpenKey; solves the "4 players must confirm in 15 minutes" pain without needing club approval |
| 2026-11-04 | React + Vite + Supabase + Vercel | Fits the founder's React base, free tier covers the pilot, Capacitor path to mobile |
| 2026-11-11 | TypeScript | Industry standard; easier onboarding for future developers |
| 2026-11-04 | Serve both clubs (B2B) and players (B2C) | Clubs bring the courts that players later book; club first, marketplace second |
| 2026-11-13 | Google sign-in only for v0.1 | Supabase built-in email only reaches team members; Google needs no email service. Email and other providers later |
| 2026-11-13 | WhatsApp numbers in a private table | Only the owner and teammates of a full match can read them, enforced by the database |
| 2026-11-13 | Players outside the category range can still join, with a warning | Keeps v0.1 simple; request/approval flow later if needed |
