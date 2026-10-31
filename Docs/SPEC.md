# IMS — Functional Specification (V1)

Place this file at `docs/SPEC.md`. CLAUDE.md holds the engineering rules; this file holds the *what*.

## 1. Scope decisions (locked)
| Area | Decision |
|---|---|
| Deployment | LAN server: one PC runs API + PostgreSQL, clients use a browser. Fully offline. |
| Language | JavaScript only (no TypeScript) |
| UI languages | English, Dari (`fa`), Pashto (`ps`) with RTL |
| Calendar | Gregorian and Shamsi — global default, per-user preference, and per-input toggle |
| Currency | Multi-currency, one base currency (default AFN), exchange rates with history |
| Costing | FIFO or AVG, one global setting, locked after first stock movement |
| Locations | One company, multiple warehouses/shops, stock transfers |
| Payments | Cash, credit and partial payments; customer & supplier ledgers |
| Products | Variants and serial numbers supported (both toggleable modules) |
| Printing | A4/A5 invoice, thermal 80mm receipt, barcode labels — every template field configurable |
| Services | Module toggles, scheduled backups, in-app notifications |
| Distribution | Open-source GitHub repo + installable for local shops |

## 2. Settings
- **Company:** name (en/fa/ps), logo, address, phones, email, tax number, footer/terms text.
- **Regional:** default language, default calendar, digit style, date format, timezone (default Asia/Kabul), first day of week.
- **Currencies:** list, base currency, symbol/position, decimals; exchange rates with effective date (history kept; documents snapshot the rate used, editable on the document).
- **Inventory:** costing method (locked after first movement), allow negative stock, default warehouse, low-stock defaults.
- **Sales/Purchases:** default payment terms, default walk-in customer, price-includes-tax flag, rounding rules, max discount % per role.
- **Numbering:** per document type — prefix, padding, yearly reset, next number.
- **Modules:** toggles for `pos, multiWarehouse, variants, serials, quotations, purchaseOrders, expenses, tax, multiCurrency, priceLevels`.
- **Printing:** see §9.
- **Backup:** schedule, folder, retention count.
- **Notifications:** which alerts are enabled, thresholds.
- **First-run setup wizard:** company info → base currency → costing method (with warning that it locks) → first warehouse → admin user → optional demo data.

## 3. Users, roles, audit
- Users: name, username, password, phone, language/calendar/digit preferences, allowed warehouses, active flag.
- Roles: custom roles built from permission keys. Seeded: Admin, Manager, Accountant, Storekeeper, Cashier.
- Permissions: `resource.view/create/update/delete/post/void/import/export`, plus special ones: `reports.profit`, `products.viewCost`, `sales.overrideDiscount`, `sales.belowCost`, `settings.manage`, `backup.manage`, `users.manage`.
- Audit log screen: list (with the standard list features), before/after diff view.

## 4. Master data
- **Categories** (tree), **Brands**.
- **Units of measure** + per-product unit conversions (e.g. carton = 12 box, box = 10 pcs). Base unit per product; default purchase unit and sale unit.
- **Products:** name (multilingual), code, category, brand, type (`stock` | `service`), base unit, tax rate, track serials flag, reorder level, min/max stock, image, notes, active.
  - **Variants:** attributes (e.g. size, color) generate variants; each variant has SKU, barcode(s), cost price reference, sale prices per price level, active. A product without variants has one default variant (hidden in UI when the variants module is off).
- **Price levels:** e.g. Retail, Wholesale; customers can have a default price level.
- **Warehouses:** name, code, address, active.
- **Customers / Suppliers:** name, code, phone(s), address, default currency, credit limit (customers), payment terms (days), price level, notes, opening balance, active. Detail page shows ledger, documents, balance per currency.
- **Tax rates** (when tax module on).
- **Payment methods / cash accounts:** Cash (per currency), Bank, Card, Mobile wallet — used to record where money goes.

## 5. Inventory
- **Stock ledger** (`stock_movements`): date, type, document ref, variant, warehouse, qty (+/− in base unit), unit cost (base), total cost, serial ref, user.
- **Stock balances** per variant × warehouse; stock screen with valuation.
- **FIFO:** `cost_layers` created by inbound movements; outbound consumes oldest first; consumptions recorded so returns can restore exact costs.
- **AVG:** moving weighted average per variant × warehouse, recalculated on each inbound.
- **Returns costing:**
  - Sales return → goes back in at the original COGS of the returned sale line.
  - Purchase return → goes out at the original purchase cost of that purchase line (FIFO: from that purchase's layer if remaining; AVG: adjusts average).
- **Transfers:** out of warehouse A at current cost, into B at the same cost (status: draft → in transit → received).
- **Stock adjustments:** increase/decrease with reason (damage, loss, expired, found, correction).
- **Stock count:** create count sheet for a warehouse (filter by category), enter counted qty (supports barcode scanning), review differences, post as adjustment.
- **Opening stock:** document type to load initial qty + cost per warehouse (importable).
- **Serials:** status `in_stock | sold | returned | transferred | written_off`; serial history view.
- Low-stock / reorder report and alert.

## 6. Purchasing
- **Purchase order** (module): draft → sent → partially received → received/closed. Convert to purchase.
- **Purchase (invoice):** supplier, warehouse, date, currency + rate, lines (variant, unit, qty, unit cost, discount, tax, serials), document discount, additional costs (shipping — distributed into landed cost by value), payment(s) at posting (full/partial/none), due date, notes, attachments.
- **Purchase return:** linked to a purchase (or free with permission), qty ≤ purchased − already returned, refund or credit to supplier balance.
- **Supplier payments:** pay against one or more invoices or on account; currency + rate.
- **Payables:** aging report (0–30, 31–60, 61–90, 90+), supplier statement (printable).

## 7. Sales
- **Quotation** (module): convert to sale; expiry date.
- **Sale (invoice):** customer (or walk-in), warehouse, date, currency + rate, price level, lines (variant, unit, qty, price, discount, tax, serials), document discount, payment(s) — full/partial/credit, multiple payment methods, due date, notes.
  - Warn on: credit limit exceeded, selling below cost (block unless permission), insufficient stock.
  - Store COGS per line at posting (for profit reports).
- **Sale return:** linked to a sale, qty ≤ sold − already returned, refund (cash) or credit to customer balance, serial selection.
- **Customer receipts:** against invoices or on account.
- **Receivables:** aging report, customer statement (printable), overdue list.

## 8. POS (module)
- Full-screen, touch-friendly, keyboard-first.
- Barcode scanner input (keyboard wedge) always focused; product search by name/code/barcode; category quick grid.
- Cart: qty, unit switch, line discount (limited by role), serial pick, customer select (walk-in default), price level.
- Payment dialog: split across methods and currencies, change calculation in base and selected currency, credit (requires customer).
- Hold / resume carts; reprint last receipt; quick returns by scanning receipt number.
- Cash register sessions: open with float, close with counted cash, expected vs counted report (Z-report).
- Shortcuts: F2 search, F4 customer, F8 hold, F9 pay, Esc cancel (configurable, shown on screen).
- Prints 80mm receipt automatically after payment (setting).

## 9. Printing
- Templates: **A4 invoice, A5 invoice, thermal 80mm receipt, barcode label**. Applies to sales, returns, purchases, quotations, POs, receipts/payments, transfers, statements.
- Per template, configurable in Settings with live preview:
  - Show/hide fields: logo, company name/address/phones, tax number, document title, number, date (calendar choice), customer/supplier info, customer previous & new balance, item code/barcode, unit, discount column, tax column, serials, totals in words, amount in base currency, payment summary, notes, terms, signature boxes, QR code (document number), footer text.
  - Language of print (can differ from UI), calendar of print, paper margins, font size.
  - Column order for line tables.
- Barcode labels: label size (mm), sheet layout (columns/rows) or roll printer, fields (name, variant, price, barcode, SKU, company), barcode format (CODE128/EAN13), print queue from product list or from a purchase.
- Implementation: React print components + `@page` CSS + print preview dialog; browser print for V1.

## 10. Expenses (module)
- Expense categories; expense entries with date, category, amount, currency + rate, payment method, warehouse/branch, note, attachment. Included in profit & loss.

## 11. Dashboard & reports
- **Dashboard:** today/this-month sales, profit, purchases, expenses; sales trend chart; top products; low-stock list; receivables/payables totals; recent documents. Filter by warehouse and date range. Cards respect permissions (no profit for cashiers).
- **Reports** (each with filters, export xlsx/csv, print):
  - Sales: by period, by product, by category, by customer, by user, by warehouse; returns.
  - Purchases: by period, product, supplier; returns.
  - Inventory: stock on hand, stock valuation (at cost), stock movement history per product, low stock, dead stock (no sales in N days), serial lookup, transfer history.
  - Financial: gross profit per invoice/product/category, simple profit & loss (sales − COGS − expenses), receivables & payables aging, customer/supplier statements, cash summary by payment method, POS register sessions.
  - Audit log.

## 12. Build phases
Each phase ends with tests, seed, CLAUDE.md update, summary + manual test checklist, then **stop for review**.

0. **Foundation:** monorepo, tooling (ESLint, Prettier, Vitest), Docker Compose Postgres (dev), Express skeleton (error handling, logging, validation, health), Prisma setup, React shell (router, layout, sidebar, topbar), design system via `frontend-design` skill (tokens, light/dark), shadcn in JS mode, i18n en/fa/ps + RTL switching, fonts bundled, `<DateInput>` with calendar toggle, money/qty helpers, **generic list engine** (API helper + `<DataTable>` + export + import flow) demonstrated on one sample resource.
1. **Auth & settings:** users, roles/permissions, auth, audit log, settings screens (company, regional, currencies & rates, numbering, modules), first-run setup wizard.
2. **Master data:** categories, brands, units & conversions, products + variants, price levels, warehouses, customers, suppliers, tax rates, payment methods — all with full list features and import/export.
3. **Inventory core:** stock ledger, costing engine (FIFO + AVG) with exhaustive tests, balances, opening stock, adjustments, transfers, stock count, serials.
4. **Purchasing:** purchase orders, purchases, purchase returns, supplier payments, party ledger, payables.
5. **Sales:** quotations, sales, sale returns, customer receipts, receivables, credit limit, below-cost guard.
6. **POS:** screen, payments, holds, register sessions, quick returns.
7. **Printing:** templates, template settings + preview, barcode labels.
8. **Expenses.**
9. **Dashboard & reports.**
10. **Services:** notifications (low stock, overdue receivables, quotation expiry, backup failure) via in-app notification center (SSE), scheduled backups (`pg_dump`), manual backup/download, restore.
11. **Release:** production build (API serves web), Windows install guide (Node + PostgreSQL + run as service), Docker Compose option, LAN access guide, demo seed, Playwright E2E for core flows, README, user guide, CONTRIBUTING, LICENSE, version 1.0.0 tag.

## 13. Open items (decide before Phase 11)
- License for the public repo (e.g. MIT vs AGPL-3.0 — AGPL protects against others selling it as a closed service).
- Whether shop installs need a license key / activation, or are sold as installation + support only.
- Silent printing to thermal printers without the browser dialog (would need a small local print agent — post-V1).
- Optional cloud sync (post-V1; keep IDs as UUIDs so it stays possible).
