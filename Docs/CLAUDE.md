# CLAUDE.md — Inventory Management System (IMS)

Read this file fully at the start of every session. The full feature spec is in `docs/SPEC.md`; read the section for the module you're working on before touching it.

## What this is
An offline (LAN) inventory, sales, purchasing and POS system for shops and wholesalers. One PC runs the API + PostgreSQL; other devices use the web app in a browser on the local network. Multilingual (English, Dari, Pashto with RTL), dual calendar (Gregorian + Shamsi), multi-currency, multi-warehouse, FIFO/AVG costing. Open source and also sold/installed for local shops.

## Stack (JavaScript only — NO TypeScript)
- **Monorepo:** pnpm workspaces
  - `apps/web` — React + Vite, Tailwind CSS, shadcn/ui (JS mode, `"tsx": false`), React Router, TanStack Query, TanStack Table, React Hook Form + Zod, Recharts, i18next, react-multi-date-picker (Gregorian + Persian calendar), lucide-react, sonner, JsBarcode, decimal.js
  - `apps/api` — Node + Express 5, Prisma + PostgreSQL, Zod, pino, helmet, cookie-parser, jsonwebtoken, argon2, multer, exceljs, csv-parse/csv-stringify, node-cron, decimal.js
  - `packages/shared` — Zod schemas, enums, permission keys, module keys, money/qty helpers, list-query contract. Imported by both apps.
- ES modules everywhere (`"type": "module"`). Use the latest stable versions; check official docs when an API is unclear rather than guessing.
- JSDoc on every exported function and service method. `jsconfig.json` with `checkJs: true` for editor hints.
- Lint/format: ESLint + Prettier. Tests: Vitest (+ Supertest for API), Playwright for E2E.

## Commands
```
pnpm install
pnpm dev              # api + web concurrently
pnpm db:up            # docker compose up postgres (dev only)
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # demo data
pnpm test             # vitest all workspaces
pnpm e2e              # playwright
pnpm lint && pnpm format
pnpm build            # web build is served by the api in production (single port)
```
Keep this list accurate — update it when scripts change.

## Repo layout
```
apps/api/src/
  app.js, server.js
  config/            env + constants
  lib/               prisma client, logger, errors, money, list-query, export, import, audit
  middleware/        auth, requirePermission, requireModule, validate, errorHandler
  modules/<name>/    <name>.routes.js, <name>.controller.js, <name>.service.js, <name>.schema.js, <name>.test.js
  jobs/              backup, notifications (node-cron)
apps/api/prisma/     schema.prisma, migrations/, seed.js
apps/web/src/
  app/               router, providers, layout (sidebar, topbar)
  components/ui/     shadcn components
  components/common/ DataTable, FilterBar, ImportDialog, ExportMenu, DateInput, MoneyInput, QtyInput, CurrencySelect, PrintPreview, ConfirmDialog, PageHeader, EmptyState
  features/<name>/   pages, components, api hooks (useXxxList, useXxx, useCreateXxx…)
  lib/               api client, i18n, dates, money, permissions
  locales/{en,fa,ps}/*.json
  print/             print templates (A4, A5, thermal 80mm, labels)
  styles/            tokens.css, globals.css
packages/shared/src/
docs/                SPEC.md, ADRs, user guide
```

## Non-negotiable rules

### Money & quantities
- Never use JS floats for money or quantity math. Use `decimal.js` (helpers in `packages/shared`).
- DB: `Decimal(18,4)` for amounts, quantities, rates and costs. Prisma returns Decimal → convert through helpers only.
- Every monetary document stores `currencyId`, `exchangeRate` (to base), document-currency amounts AND base-currency amounts.
- Inventory costs are always in base currency.

### Inventory integrity
- **`stock_movements` is the single source of truth.** Stock is never edited directly. Every stock change (purchase, sale, returns, adjustment, count, transfer, opening stock) goes through `modules/inventory/inventory.service.js` → `postMovements()` inside one Prisma transaction.
- `stock_balances` (variant × warehouse: qty, avgCost) and `cost_layers` (FIFO) are derived, kept in sync inside the same transaction, and can be rebuilt by a `rebuildStock` script.
- Costing method is a global setting (FIFO or AVG), **locked after the first stock movement**.
- Stock is tracked per **product variant** per **warehouse**, in the product's **base unit**. Document lines store `unitId` + `unitFactor`; convert to base on posting.
- Negative stock is blocked by default (setting `allowNegativeStock`, default false).
- Serial-tracked variants: each unit has a serial row; sales/returns must select serials; cost = that serial's purchase cost.
- Lock rows when consuming FIFO layers (`SELECT ... FOR UPDATE` via `$queryRaw` inside the transaction) to stay correct with concurrent POS terminals.
- The costing engine must have exhaustive unit tests (FIFO, AVG, returns, transfers, partial layers, serials, multi-currency purchases) before any UI uses it.

### Documents
- Lifecycle: `draft → posted → voided`. Posted documents are immutable. Void = reversing movements + ledger entries, never deletion.
- Numbering per document type: prefix + yearly sequence, configurable in settings, generated inside the posting transaction.
- Customer/supplier balances come from a `party_ledger` (debit/credit, per currency + base). Never store a mutable "balance" column as the source of truth.

### Lists (every list screen)
- One shared contract, built once in Phase 0, reused everywhere:
  - API: `GET /api/<resource>?q=&page=&pageSize=&sort=field:asc,field2:desc&filters=<json>` → `{ data, meta: { page, pageSize, total } }`. Server-side search, filter, sort, pagination.
  - Filters JSON: `[{ field, op, value }]` with ops `eq, neq, in, contains, gte, lte, between, isNull`. Each resource declares an allow-list of searchable/filterable/sortable fields — never pass raw fields into Prisma.
  - Export: `GET /api/<resource>/export?format=xlsx|csv&columns=...&<same filters>` exports all matching rows. PDF = print view.
  - Import: `GET /api/<resource>/import/template` → `POST /api/<resource>/import/validate` (returns per-row errors + preview) → `POST /api/<resource>/import/commit`. Master data imports create records; transactional imports create **drafts only**.
- Web: `<DataTable resource columns filters />` handles search box (debounced), filter bar, column visibility, sort, pagination, row selection, saved filter presets (per user), export menu, import dialog. Filter/sort/page state lives in the URL.

### Dates, language, RTL
- Store timestamps in UTC (`timestamptz`); date-only fields as `date`.
- Calendar: global default (Settings) + per-user preference + per-input toggle on `<DateInput>` (Gregorian ⇄ Shamsi). All display goes through `lib/dates.js` — never format dates inline.
- Languages: `en`, `fa` (Dari), `ps` (Pashto). No hard-coded UI strings — always `t('key')`. Add keys to all three locale files (English text as placeholder if a translation is missing, marked `// TODO-i18n`).
- RTL: set `dir` on `<html>`. Use Tailwind logical utilities only (`ms-/me-/ps-/pe-/start-/end-/text-start`). Never `ml-/mr-/pl-/pr-/left-/right-/text-left`. Directional icons must flip.
- Fonts: Vazirmatn (fa/ps), Inter (en), bundled locally (offline — no CDN fonts).
- Digit display (Latin / Eastern Arabic) is a user setting.

### Offline
- No runtime dependency on the internet: no CDNs, no external fonts, no external APIs. Everything bundled.
- In production the API serves the built web app; one port, reachable on the LAN.

### Security & access
- JWT access token (short) + refresh token, both httpOnly cookies. Passwords with argon2.
- Permissions are keys `resource.action` (e.g. `sales.create`, `sales.post`, `sales.void`, `reports.profit`, `settings.manage`) defined in `packages/shared`. Every route uses `requirePermission(...)`; the UI hides what the user can't do, but the API is the enforcer.
- Users can be restricted to specific warehouses.
- Module toggles (`pos, multiWarehouse, variants, serials, quotations, purchaseOrders, expenses, tax, multiCurrency, priceLevels`) enforced by `requireModule()` on the API and nav/feature hiding on the web.
- Audit log for every create/update/post/void/delete and settings change: user, action, entity, entityId, before/after JSON, IP, timestamp.

### API conventions
- Validate every request body/query with Zod schemas from `packages/shared`.
- Controllers are thin; business logic lives in services; services receive a Prisma transaction client when composed.
- Errors: throw `AppError(code, httpStatus, i18nKey, details)`; central handler returns `{ error: { code, message, details } }`. The web maps `code` to a translated message.
- REST, plural kebab-case resources, `/api` prefix. Actions as sub-resources: `POST /api/sales/:id/post`, `POST /api/sales/:id/void`.

### UI
- Load the `frontend-design` skill before building or restyling UI. The design system lives in `styles/tokens.css` (CSS variables) + Tailwind theme; never hard-code colors.
- Light + dark theme. Dense but readable tables; keyboard-friendly forms (Enter to move/submit, shortcuts on POS).
- Every page: loading skeleton, empty state, error state. Every destructive action: confirm dialog. Toasts for results.
- Responsive down to tablet; the POS should be usable on a touch screen.

## Workflow rules for Claude Code
- Work **one phase at a time** (phases in `docs/SPEC.md` §12). At the start of a phase: use plan mode, list the files you'll create/change, then build.
- End every phase with: migrations applied, tests passing, lint clean, `pnpm dev` runs, seed updated, this file updated if conventions/commands changed, and a short summary + manual test checklist. Then **stop and wait for review**.
- Small, focused commits with conventional commit messages (`feat(sales): ...`, `fix(inventory): ...`).
- Never break the stock ledger rules above to make a feature easier. If a requirement conflicts with them, stop and ask.
- Don't add dependencies outside the stack list without stating why in the phase summary.
- When unsure about a business rule, check `docs/SPEC.md`; if it's not there, ask instead of inventing.
- Record significant architecture decisions as short ADRs in `docs/adr/NNN-title.md`.
