# Notes for AI assistants and new developers

- Product context and phases: `docs/ROADMAP.md`. Keep v0.1 scope tight: match-making only.
- UI text in Argentine Spanish (voseo). Code, identifiers, comments and commit messages in English.
- Feature code lives in `src/features/<feature>/`; shared domain types in `src/types/domain.ts`.
- Database changes go in `supabase/migrations/` as SQL files, always with row-level security policies.
- Run `npm run build` and `npm run lint` before committing; both must pass.
