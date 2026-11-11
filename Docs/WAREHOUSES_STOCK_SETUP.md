# Warehouses and Stocks sections

This is an additive extension to the existing Inventory Management System. It keeps the existing login, product management, purchase-return and sales-return modules, layout, router architecture, and package manifests.

## What was added

- A Warehouses page at `/warehouses` to create, edit, activate and deactivate warehouses.
- A Stocks page at `/stock` with inventory by warehouse, movement history, stock transfers and manual adjustments.
- Warehouse and stock REST endpoints under `/api/warehouses` and `/api/stock`.
- An additive PostgreSQL migration that adds an active flag, a stock movement ledger, transfer and adjustment records, and database triggers for purchase, sale, sales-return and purchase-return item changes.
- An initial `Regional Warehouse`. The migration transfers 15% of the existing Main Warehouse quantities to it, recording both sides of the transfer. Company-wide quantities are unchanged.

## Important database note

Do **not** rerun `Database/inventory.sql` against a database containing data. That file intentionally drops and recreates the original tables. Apply only this migration to your existing database:

```bash
psql -h localhost -p 5432 -U inventoryUser -d inventoryDB -f Database/migrations/001_warehouses_stock_sections.sql
```

Adjust the host, port, username and database name to match `Backend/.env`.

The migration is designed to be rerunnable. It backfills the ledger from existing purchase, sale, sales-return and purchase-return item rows, then installs triggers so later item inserts, updates and deletes are recorded in the ledger. The existing document services remain responsible for updating the `stocks` table in the same transaction as their document changes.

## Start the application

Open two terminals from the project root.

Backend:

```bash
cd Backend
cp .env.example .env
# Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME in .env
npm install
npm run dev
```

Frontend:

```bash
cd Frontend
cp .env.example .env
npm install
npm run dev
```

The frontend `.env` should point to the backend API, for example:

```env
VITE_API_URL=http://localhost:8000/api
```

The root `package.json` and both application package manifests were intentionally left unchanged. Run the frontend and backend from their own folders because the original root development script references `FrontEnd` and `BackEnd`, while the actual directories are named `Frontend` and `Backend`.

## API endpoints

### Warehouses

- `GET /api/warehouses` - list warehouses with product counts and total quantities.
- `GET /api/warehouses/:id` - get one warehouse.
- `POST /api/warehouses` - create `{ "name": "North Warehouse", "location": "Berlin" }`.
- `PUT /api/warehouses/:id` - update `{ "name": "North Warehouse", "location": "Berlin", "isActive": true }`.
- `DELETE /api/warehouses/:id` - deactivate a warehouse. It is a soft deactivation so historical records and stock are preserved.

### Stocks

- `GET /api/stock/summary` - product, warehouse, unit, valuation and low-stock totals.
- `GET /api/stock?warehouseId=1&search=mouse` - inventory rows by warehouse.
- `GET /api/stock/movements?warehouseId=1&type=sale&limit=100` - stock movement ledger.
- `POST /api/stock/transfers` - transfer stock atomically between two active warehouses.

Example transfer body:

```json
{
  "sourceWarehouseId": 1,
  "destinationWarehouseId": 2,
  "items": [{ "productId": 1, "quantity": "5" }],
  "notes": "Move stock to the city branch"
}
```

- `POST /api/stock/adjustments` - make a positive or negative stock correction with a reason.

Example adjustment body:

```json
{
  "warehouseId": 1,
  "productId": 1,
  "direction": "decrease",
  "quantity": "2",
  "reason": "Damaged during physical stock count"
}
```

## Stock movement rules

| Document/event | Stock effect |
|---|---:|
| Purchase item | Increase |
| Sale item | Decrease |
| Sales-return item | Increase |
| Purchase-return item | Decrease |
| Transfer out | Decrease in source warehouse |
| Transfer in | Increase in destination warehouse |
| Adjustment in/out | Increase/decrease with mandatory reason |

Transfers and adjustments update `stocks` and `stock_movements` in one PostgreSQL transaction. The database triggers record the four existing document item tables in the same transaction as document changes, and they apply purchase/sale stock deltas automatically. Existing return services apply return stock deltas. A negative stock balance is rejected for sales, purchase/sales-return reversals where applicable, transfers and adjustments.

## Scope intentionally left unchanged

- Existing purchase and sales pages remain as they were in the uploaded project. In the original project these routes are placeholders, not working document-entry screens. The migration records their existing document rows and will record later purchase/sale item writes made by a document workflow, but this extension does not build new purchase or sales screens.
- Existing product, login, user, customer, supplier, report and settings modules are not redesigned.
- Stock valuation is an estimate using each product's current `purchase_price`; this is not FIFO or weighted-average accounting valuation.
- Existing purchase-return and sales-return services were not rewritten. Their item-table writes are captured by the migration's database triggers.

## Verification

After migration and startup:

1. Open `/warehouses` and confirm Main Warehouse, City Shop and Regional Warehouse appear.
2. Open `/stock` and compare total company stock before/after migration. The 15% distribution should not change the company-wide total.
3. Check movement history for purchase, sale, sales-return and purchase-return entries.
4. Transfer a small quantity between warehouses and confirm the source decreases and destination increases by the same amount.
5. Try transferring more than the source balance; the request should fail and neither warehouse should change.
6. Make an adjustment with a reason and confirm it appears in the movement history.
