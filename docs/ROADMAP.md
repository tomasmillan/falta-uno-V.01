# Roadmap

## v0.1 — Match-making pilot (current)

Goal: neighbours in one gated community use it to complete their matches. Court booking stays in the community's existing system (OpenKey); Falta Uno makes sure the four players are confirmed before anyone books.

1. [x] Project base: React + TypeScript + Vite, folder structure, README
2. [ ] Accounts: Supabase project and Vercel deployment connected to this repo
3. [ ] Auth and profile: sign in with Google (email and other providers later); name, category (8va–1ra), preferred side, WhatsApp
4. [ ] Matches: create a match, list open matches with "Falta 1" badge, join and leave, live updates (Supabase Realtime)
5. [ ] Share and ship: "Share on WhatsApp" link per match; deployed URL tested with 3–4 players

Success: 10 real players, 5 matches completed through the app in the first two weeks.

## v0.1.1 — Create match improvements

- [x] Clubs table; every match and profile belongs to a club
- [x] Court optional ("a definir") and editable by the creator after booking
- [x] 90-minute booking slots
- [x] Warning when a similar open match already exists
- [x] Schedule conflicts blocked: a player in two matches at once, or two matches on the same court and slot

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

## Backlog by phase

Ideas collected so far, placed where they become possible. Strategy: be the best at match-making for gated communities first; the rest follows.

| Phase | Players | Clubs | Differentiators |
| --- | --- | --- | --- |
| v0.1 (done) | Open matches by category, player profile | — | — |
| v0.2 | "Mis partidos": match history and matches played (requested by a pilot tester) | Court agenda for staff, usage reports for the club (matches, occupancy, active players) | — |
| v0.3 | Results per match, ranking from results, player stats (requested by a pilot tester) | — | Tournaments and "americanos": brackets, results, standings |
| v1.0 | Real-time availability grid, split payments, court pre-booking with a confirmation deadline (2 h) and a small fee if not confirmed | Unified calendar (app + manual bookings), recurring fixed slots, cancellation rules and deposits, cash and revenue reports | WhatsApp confirmations and payment links |
| Later | Club search and map (location, court type, price), automatic notifications (reminders, freed slots, rain) | Equipment rental (balls, rackets) | Loyalty points and discounts |

## Pilot metrics

Tracked with SQL queries on Supabase (no dashboard yet): matches created, matches completed (full), weekly active players.

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
| 2026-11-16 | Court optional when creating a match | With OpenKey the court is booked after the four players confirm |
| 2026-11-16 | club_id on matches and profiles now | Cheap with one club; expensive to retrofit with several |
| 2026-11-16 | Pull-request workflow | Founder reviews each feature's diff and preview before merging |
| 2026-11-18 | One match per player per slot; one match per court per slot | Prevents impossible schedules; enforced in the database (unique index + function checks) |
