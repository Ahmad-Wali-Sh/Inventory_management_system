# Backend/frontend integration, Suppliers and Purchases

## What changed

- Standardized the API default to `http://localhost:8000/api`.
- Corrected the PostgreSQL default port to `5432` (the standard PostgreSQL port).
- Added `GET/POST/PUT/DELETE /api/suppliers` using the existing supplier table.
- Added purchase list, options, detail and create endpoints under `/api/purchases`.
- Added a Suppliers CRUD page and a Purchases page with supplier, warehouse and product selection, line totals, discount, invoice history and details.
- Purchase creation is transactional. It inserts purchase headers and lines; the database trigger installed by `001_warehouses_stock_sections.sql` updates the selected warehouse stock and writes the stock ledger within the same transaction.

## Database setup for a brand-new empty database

1. Create a database named `inventorydb` in pgAdmin.
2. Run `Database/inventory.sql` once against that empty database. It drops and recreates application tables, so never run it against a database containing data you need to keep.
3. Run `Database/migrations/001_warehouses_stock_sections.sql` against the same database.

For an existing database already containing your project data, do NOT run `Database/inventory.sql`. Back up the database and run only the additive migration if it has not already been applied.

## Backend environment

Copy `Backend/.env.example` to `Backend/.env` and set the real PostgreSQL username and password:

```env
PORT=8000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_real_postgres_password
DB_NAME=inventorydb
```

Then:

```bash
cd Backend
npm install
npm run dev
```

Test `http://localhost:8000/api/health`. It should return `{ "status": "ok" }`.

## Frontend environment

Copy `Frontend/.env.example` to `Frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

Then in a second terminal:

```bash
cd Frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:3000` or `http://localhost:5173`, depending on the existing Vite configuration).

## New screens

- `/suppliers`: supplier CRUD (create, edit, delete, search).
- `/purchases`: create a purchase, browse purchase history, and view purchase details.

A purchase requires at least one supplier, one active warehouse, one product and one seeded application user. The starter project currently uses a demo-only frontend login, not real API authentication. Until real authentication is implemented, the backend attributes purchases to the first existing admin user (or first user if no admin exists). This is clearly isolated in `purchase.service.js` and should be replaced when API authentication is added.

## Important

Purchase records are intentionally not editable/deletable from this initial screen. Editing or deleting a posted purchase must reverse its original stock effects and ledger entries in a safe database transaction; this should be implemented as a dedicated reversal workflow rather than a generic CRUD delete.
