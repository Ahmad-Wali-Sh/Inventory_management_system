You are starting a new open-source project: an offline (LAN) Inventory Management System with POS.

Before doing anything:
1. Read `CLAUDE.md` (engineering rules — follow them strictly) and `docs/SPEC.md` (functional spec, scope decisions, build phases).
2. Enter plan mode.

Your task now is **Phase 0 — Foundation only** (SPEC §12). Do not start Phase 1.

Phase 0 deliverables:
- pnpm monorepo: `apps/api`, `apps/web`, `packages/shared`, ES modules, **JavaScript only (no TypeScript)**, `jsconfig.json` with `checkJs`, ESLint + Prettier, Vitest, root scripts exactly as listed in CLAUDE.md.
- `docker-compose.yml` with PostgreSQL for development, `.env.example` for api and web.
- API skeleton: Express 5, helmet, cookie-parser, pino logging, Zod validation middleware, `AppError` + central error handler, `/api/health`, Prisma client setup with an initial migration.
- **Generic list engine** (most important part of this phase):
  - `apps/api/src/lib/list-query.js`: parses `q, page, pageSize, sort, filters` per the CLAUDE.md contract, applies a per-resource allow-list, returns `{ data, meta }`.
  - Export helper (xlsx via exceljs, csv) and the 3-step import flow (template → validate with per-row errors → commit).
  - Demonstrate everything on one sample resource (`units` — units of measure) end to end, with tests.
- Web shell: React + Vite, Tailwind, shadcn/ui in JS mode, React Router, TanStack Query, app layout (collapsible sidebar with module-aware nav, topbar with language switcher, calendar switcher, theme toggle, user menu placeholder).
- **Design system:** load the `frontend-design` skill first, then create `styles/tokens.css` (CSS variables, light + dark), Tailwind theme mapped to tokens, and a short `docs/design-system.md`. Aim for a modern, clean, professional look suited to dense business data — not a generic template. Bundle Inter and Vazirmatn locally (no CDNs; the app must run with zero internet).
- i18n: i18next with `en`, `fa` (Dari), `ps` (Pashto), RTL switching via `dir` on `<html>`, logical Tailwind utilities only.
- Shared components: `DataTable` (search, filter bar, sort, pagination, column visibility, row selection, URL state, export menu, import dialog), `DateInput` (Gregorian ⇄ Shamsi toggle per input, honoring global/user default), `MoneyInput`, `QtyInput`, `PageHeader`, `EmptyState`, `ConfirmDialog`, loading skeletons, toasts.
- `packages/shared`: decimal helpers (decimal.js), list-query Zod schema, enums, empty permission & module key registries.
- The `units` list page in the web app using `DataTable`, with create/edit dialog, import and export working, in all three languages and both directions.

Process:
- First, show me the plan: folder tree, dependencies with versions, the list-engine API design, and the design direction (palette, typography, density) — then wait for my approval.
- After approval, build it with small conventional commits.
- Finish with: tests passing, lint clean, `pnpm dev` working, a summary of what was built, any deviations from CLAUDE.md with reasons, and a manual test checklist. Then stop and wait for review.

If anything in CLAUDE.md or SPEC.md is unclear or conflicts, ask before deciding.
