# Inventory Management System - Local Setup

## Requirements

- Node.js 22 or newer (use a current Node 22 LTS release supported by your installed Vite version)
- PostgreSQL 15+ and pgAdmin (or `psql`)

## 1. Database

Create an empty PostgreSQL database named `inventorydb`.

For a brand-new database only, execute these SQL files in this order:

1. `Database/inventory.sql`
2. `Database/migrations/001_warehouses_stock_sections.sql`

**Never run `Database/inventory.sql` against a database containing data you want to keep.** It drops and recreates the base tables. For an existing database, back it up and apply only the additive migration if it has not already been applied.

## 2. Environment

Copy `Backend/.env.example` to `Backend/.env` and enter your actual PostgreSQL username and password. The default PostgreSQL port is `5432`.

Copy `Frontend/.env.example` to `Frontend/.env`. The frontend API URL must point to the backend port:

```env
VITE_API_URL=http://localhost:8000/api
```

## 3. Install dependencies

From the project root:

```bash
npm run install:all
```

## 4. Start both applications

From the project root:

```bash
npm run dev
```

Or start them in separate terminals:

```bash
cd Backend
npm run dev
```

```bash
cd Frontend
npm run dev
```

Backend API: `http://localhost:8000/api`

Backend health check (also tests PostgreSQL): `http://localhost:8000/api/health`

Frontend: `http://localhost:3000`

## Sections

- Products: `/products`
- Suppliers: `/suppliers`
- Purchases: `/purchases`
- Purchase Returns: `/purchase-returns`
- Warehouses: `/warehouses`
- Stocks: `/stock`

Purchases are posted as immutable source documents. Use the Purchase Returns workflow to record returned goods rather than deleting a posted purchase and silently rewriting stock history.

## Authentication note

The starter project still has demo-only frontend login. It does not authenticate against the backend yet. Purchase records are attributed to the first seeded admin user (or first seeded user). Do not deploy this demo authentication to production without implementing server-side authentication and authorization.
