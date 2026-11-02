-- =====================================================================
--  Inventory Management System (student project)
--  PostgreSQL schema + seed data
--
--  How to run (creates a fresh database every time):
--     createdb inventory_db
--     psql -d inventory_db -f inventory.sql
--
--  The script drops the tables first, so you can run it again at any
--  time to reset everything back to the demo data.
--
--  Design notes:
--   * IDs are SERIAL (auto increment integers).
--   * Sales and purchases have a header table + an items table.
--   * Returns are free standing. They can OPTIONALLY point to the
--     original sale / purchase (the link column may be NULL).
--   * Stock is stored per product per warehouse in the "stocks" table.
--     There are NO triggers: the Express backend updates "stocks"
--     whenever it saves a sale, purchase or return (inside a transaction).
--   * created_at / updated_at are timestamps. Express should set
--     updated_at = NOW() when it updates a row.
--   * Money and quantity use NUMERIC (exact), never FLOAT.
--
--  Demo logins (passwords are stored as bcrypt hashes):
--     admin   / 123456
--     manager / 123456
--     cashier / 123456
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Clean start (drop in reverse order of dependencies)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS purchase_return_items CASCADE;
DROP TABLE IF EXISTS purchase_returns      CASCADE;
DROP TABLE IF EXISTS sale_return_items     CASCADE;
DROP TABLE IF EXISTS sale_returns          CASCADE;
DROP TABLE IF EXISTS purchase_items        CASCADE;
DROP TABLE IF EXISTS purchases             CASCADE;
DROP TABLE IF EXISTS sale_items            CASCADE;
DROP TABLE IF EXISTS sales                 CASCADE;
DROP TABLE IF EXISTS stocks                CASCADE;
DROP TABLE IF EXISTS products              CASCADE;
DROP TABLE IF EXISTS warehouses            CASCADE;
DROP TABLE IF EXISTS suppliers             CASCADE;
DROP TABLE IF EXISTS customers             CASCADE;
DROP TABLE IF EXISTS units                 CASCADE;
DROP TABLE IF EXISTS categories            CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;


-- =====================================================================
-- 1. USERS (login)
-- =====================================================================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
    description   TEXT,
    role          VARCHAR(20)  NOT NULL DEFAULT 'cashier'
                  CHECK (role IN ('admin', 'manager', 'cashier')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 2. LOOKUP TABLES
-- =====================================================================
CREATE TABLE categories (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    description   TEXT,
    image         TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE units (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL UNIQUE,   -- e.g. Piece
    short_name    VARCHAR(10)  NOT NULL UNIQUE,   -- e.g. pcs
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE warehouses (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    location      VARCHAR(255),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 3. PEOPLE WE TRADE WITH
-- =====================================================================
CREATE TABLE customers (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    phone         VARCHAR(30),
    email         VARCHAR(150),
    address       TEXT,
    image         TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE suppliers (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    phone         VARCHAR(30),
    email         VARCHAR(150),
    address       TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 4. PRODUCTS
-- =====================================================================
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(100)  NOT NULL UNIQUE,      -- SKU / barcode
    name            VARCHAR(150)  NOT NULL,
    category_id     INTEGER       NOT NULL REFERENCES categories(id),
    unit_id         INTEGER       NOT NULL REFERENCES units(id),
    purchase_price  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    sale_price      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    reorder_level   NUMERIC(12,2) NOT NULL DEFAULT 0,   -- warn when stock goes below this
    description     TEXT,
    cover           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 5. STOCKS  (how many of each product are in each warehouse)
--    One row per (product, warehouse). Updated by Express, not triggers.
-- =====================================================================
CREATE TABLE stocks (
    id            SERIAL PRIMARY KEY,
    product_id    INTEGER       NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
    warehouse_id  INTEGER       NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity      NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, warehouse_id)
);


-- =====================================================================
-- 6. SALES  (header + items)
-- =====================================================================
CREATE TABLE sales (
    id             SERIAL PRIMARY KEY,
    invoice_no     VARCHAR(30)   NOT NULL UNIQUE,      -- e.g. SAL-0001
    sale_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
    customer_id    INTEGER       NOT NULL REFERENCES customers(id),
    warehouse_id   INTEGER       NOT NULL REFERENCES warehouses(id),
    user_id        INTEGER       NOT NULL REFERENCES users(id),   -- who made the sale
    total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,  -- sum of item line_totals (set by Express)
    discount       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    discount_percent NUMERIC(5,2),
    grand_total    NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - discount) STORED,
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
    id            SERIAL PRIMARY KEY,
    sale_id       INTEGER       NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id    INTEGER       NOT NULL REFERENCES products(id),
    quantity      NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    line_total    NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- =====================================================================
-- 7. PURCHASES  (header + items)
-- =====================================================================
CREATE TABLE purchases (
    id             SERIAL PRIMARY KEY,
    invoice_no     VARCHAR(30)   NOT NULL UNIQUE,      -- e.g. PUR-0001
    purchase_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
    supplier_id    INTEGER       NOT NULL REFERENCES suppliers(id),
    warehouse_id   INTEGER       NOT NULL REFERENCES warehouses(id),
    user_id        INTEGER       NOT NULL REFERENCES users(id),
    total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    grand_total    NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - discount) STORED,
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_items (
    id            SERIAL PRIMARY KEY,
    purchase_id   INTEGER       NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id    INTEGER       NOT NULL REFERENCES products(id),
    quantity      NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),  -- cost price
    line_total    NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- =====================================================================
-- 8. SALE RETURNS  (customer brings goods back -> stock goes UP)
--    sale_id is optional: NULL means a free-standing return.
-- =====================================================================
CREATE TABLE sale_returns (
    id             SERIAL PRIMARY KEY,
    return_no      VARCHAR(30)   NOT NULL UNIQUE,      -- e.g. SRT-0001
    return_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
    sale_id        INTEGER       REFERENCES sales(id) ON DELETE SET NULL,  -- optional link
    customer_id    INTEGER       NOT NULL REFERENCES customers(id),
    warehouse_id   INTEGER       NOT NULL REFERENCES warehouses(id),
    user_id        INTEGER       NOT NULL REFERENCES users(id),
    total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,  -- amount refunded
    reason         TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_return_items (
    id              SERIAL PRIMARY KEY,
    sale_return_id  INTEGER       NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    product_id      INTEGER       NOT NULL REFERENCES products(id),
    quantity        NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    line_total      NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- =====================================================================
-- 9. PURCHASE RETURNS  (we send goods back to supplier -> stock goes DOWN)
--    purchase_id is optional: NULL means a free-standing return.
-- =====================================================================
CREATE TABLE purchase_returns (
    id             SERIAL PRIMARY KEY,
    return_no      VARCHAR(30)   NOT NULL UNIQUE,      -- e.g. PRT-0001
    return_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
    purchase_id    INTEGER       REFERENCES purchases(id) ON DELETE SET NULL,  -- optional link
    supplier_id    INTEGER       NOT NULL REFERENCES suppliers(id),
    warehouse_id   INTEGER       NOT NULL REFERENCES warehouses(id),
    user_id        INTEGER       NOT NULL REFERENCES users(id),
    total_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    reason         TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_return_items (
    id                  SERIAL PRIMARY KEY,
    purchase_return_id  INTEGER       NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    product_id          INTEGER       NOT NULL REFERENCES products(id),
    quantity            NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price          NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    line_total          NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);


-- =====================================================================
-- 10. INDEXES on foreign keys (makes JOINs and filters faster)
-- =====================================================================
CREATE INDEX idx_products_category          ON products(category_id);
CREATE INDEX idx_products_unit              ON products(unit_id);
CREATE INDEX idx_stocks_warehouse           ON stocks(warehouse_id);
CREATE INDEX idx_sales_customer             ON sales(customer_id);
CREATE INDEX idx_sales_date                 ON sales(sale_date);
CREATE INDEX idx_sale_items_sale            ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product         ON sale_items(product_id);
CREATE INDEX idx_purchases_supplier         ON purchases(supplier_id);
CREATE INDEX idx_purchases_date             ON purchases(purchase_date);
CREATE INDEX idx_purchase_items_purchase    ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product     ON purchase_items(product_id);
CREATE INDEX idx_sale_returns_sale          ON sale_returns(sale_id);
CREATE INDEX idx_sale_return_items_return   ON sale_return_items(sale_return_id);
CREATE INDEX idx_purchase_returns_purchase  ON purchase_returns(purchase_id);
CREATE INDEX idx_purchase_return_items_ret  ON purchase_return_items(purchase_return_id);


-- =====================================================================
-- 11. SEED DATA
-- =====================================================================

-- Users (password for all three is: 123456)
INSERT INTO users (username, password, description, role) VALUES
  ('admin',   '$2b$10$vbl6dXsRwzydFpfBt4sUm..7SGEBKZKsWT0pIj5GUbv/u27fbXeOi', 'System administrator', 'admin'),
  ('manager', '$2b$10$vbl6dXsRwzydFpfBt4sUm..7SGEBKZKsWT0pIj5GUbv/u27fbXeOi', 'Store manager',        'manager'),
  ('cashier', '$2b$10$vbl6dXsRwzydFpfBt4sUm..7SGEBKZKsWT0pIj5GUbv/u27fbXeOi', 'Front desk cashier',   'cashier');

INSERT INTO categories (name, description) VALUES
  ('Electronics', 'Computer accessories and gadgets'),   -- 1
  ('Stationery',  'Paper, pens and office supplies'),    -- 2
  ('Beverages',   'Drinks and tea');                     -- 3

INSERT INTO units (name, short_name) VALUES
  ('Piece',    'pcs'),   -- 1
  ('Box',      'box'),   -- 2
  ('Kilogram', 'kg'),    -- 3
  ('Liter',    'L');     -- 4

INSERT INTO warehouses (name, location) VALUES
  ('Main Warehouse', 'Kabul, District 4'),    -- 1
  ('City Shop',      'Kabul, Shar-e-Naw');    -- 2

INSERT INTO customers (name, phone, email, address) VALUES
  ('Walk-in Customer', NULL,           NULL,                  NULL),               -- 1
  ('Karimi Traders',   '0700 111 222', 'karimi@example.com',  'Kabul, Kart-e-Se'), -- 2
  ('Noor School',      '0700 333 444', 'office@noor.example', 'Kabul, Khair Khana'); -- 3

INSERT INTO suppliers (name, phone, email, address) VALUES
  ('Tech Import Co.',    '0799 100 200', 'sales@techimport.example', 'Kabul'),  -- 1
  ('Paper World',        '0799 300 400', 'info@paperworld.example',  'Herat'),  -- 2
  ('Fresh Drinks Ltd.',  '0799 500 600', 'orders@fresh.example',     'Mazar');  -- 3

INSERT INTO products (code, name, category_id, unit_id, purchase_price, sale_price, reorder_level, description) VALUES
  ('P-001', 'USB Flash Drive 32GB',  1, 1,  5.00,  8.00, 20, 'USB 3.0 flash drive'),  -- 1
  ('P-002', 'Wireless Mouse',        1, 1,  7.50, 12.00, 10, '2.4GHz wireless mouse'), -- 2
  ('P-003', 'A4 Paper (500 sheets)', 2, 2,  4.00,  6.00, 15, '80gsm copy paper'),      -- 3
  ('P-004', 'Blue Ballpoint Pen',    2, 1,  0.20,  0.50, 100, NULL),                   -- 4
  ('P-005', 'Mineral Water 1.5L',    3, 1,  0.30,  0.60, 50, NULL),                    -- 5
  ('P-006', 'Green Tea',             3, 3,  6.00,  9.00, 5,  'Loose leaf green tea');  -- 6

-- ---------- Purchases ----------
INSERT INTO purchases (invoice_no, purchase_date, supplier_id, warehouse_id, user_id, total_amount, discount, notes) VALUES
  ('PUR-0001', '2026-10-01', 1, 1, 1, 875.00, 0,  'First stock of electronics'),  -- 1
  ('PUR-0002', '2026-10-02', 2, 1, 2, 260.00, 10, 'Stationery order'),            -- 2
  ('PUR-0003', '2026-10-03', 3, 2, 2, 330.00, 0,  'Stock for the city shop');     -- 3

INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price) VALUES
  (1, 1, 100, 5.00),   -- 500.00
  (1, 2,  50, 7.50),   -- 375.00
  (2, 3,  40, 4.00),   -- 160.00
  (2, 4, 500, 0.20),   -- 100.00
  (3, 5, 200, 0.30),   --  60.00
  (3, 6,  20, 6.00),   -- 120.00
  (3, 1,  30, 5.00);   -- 150.00

-- ---------- Sales ----------
INSERT INTO sales (invoice_no, sale_date, customer_id, warehouse_id, user_id, total_amount, discount, notes) VALUES
  ('SAL-0001', '2026-10-05', 1, 1, 3, 140.00, 0, NULL),                 -- 1
  ('SAL-0002', '2026-10-06', 2, 1, 2, 110.00, 5, 'Regular customer'),   -- 2
  ('SAL-0003', '2026-10-07', 3, 2, 3,  70.00, 0, NULL);                 -- 3

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES
  (1, 1,  10, 8.00),   --  80.00
  (1, 2,   5, 12.00),  --  60.00
  (2, 3,  10, 6.00),   --  60.00
  (2, 4, 100, 0.50),   --  50.00
  (3, 5,  50, 0.60),   --  30.00
  (3, 1,   5, 8.00);   --  40.00

-- ---------- Sale returns ----------
INSERT INTO sale_returns (return_no, return_date, sale_id, customer_id, warehouse_id, user_id, total_amount, reason) VALUES
  ('SRT-0001', '2026-10-08', 1,    1, 1, 3, 12.00, 'Mouse not working'),        -- linked to SAL-0001
  ('SRT-0002', '2026-10-09', NULL, 1, 2, 3,  1.20, 'No receipt, bottles unopened'); -- free-standing

INSERT INTO sale_return_items (sale_return_id, product_id, quantity, unit_price) VALUES
  (1, 2, 1, 12.00),
  (2, 5, 2,  0.60);

-- ---------- Purchase returns ----------
INSERT INTO purchase_returns (return_no, return_date, purchase_id, supplier_id, warehouse_id, user_id, total_amount, reason) VALUES
  ('PRT-0001', '2026-10-10', 1,    1, 1, 1, 25.00, 'Damaged flash drives'),   -- linked to PUR-0001
  ('PRT-0002', '2026-10-11', NULL, 2, 1, 2,  4.00, 'Pens with no ink');       -- free-standing

INSERT INTO purchase_return_items (purchase_return_id, product_id, quantity, unit_price) VALUES
  (1, 1,  5, 5.00),
  (2, 4, 20, 0.20);

-- ---------- Stocks ----------
-- These numbers are the result of all the documents above:
--   stock = purchased - sold + sale returns - purchase returns
-- In the real app, Express keeps this table up to date for you.
INSERT INTO stocks (product_id, warehouse_id, quantity) VALUES
  -- Main Warehouse (1)
  (1, 1,  85),   -- 100 - 10 - 5
  (2, 1,  46),   --  50 - 5 + 1
  (3, 1,  30),   --  40 - 10
  (4, 1, 380),   -- 500 - 100 - 20
  -- City Shop (2)
  (1, 2,  25),   --  30 - 5
  (5, 2, 152),   -- 200 - 50 + 2
  (6, 2,  20);   --  20


-- =====================================================================
-- 12. HANDY QUERIES TO TRY (uncomment and run)
-- =====================================================================

-- Stock of every product in every warehouse:
-- SELECT p.code, p.name, w.name AS warehouse, s.quantity, u.short_name AS unit
-- FROM stocks s
-- JOIN products   p ON p.id = s.product_id
-- JOIN warehouses w ON w.id = s.warehouse_id
-- JOIN units      u ON u.id = p.unit_id
-- ORDER BY p.code, w.name;

-- Products below their reorder level (total over all warehouses):
-- SELECT p.name, COALESCE(SUM(s.quantity), 0) AS total_qty, p.reorder_level
-- FROM products p
-- LEFT JOIN stocks s ON s.product_id = p.id
-- GROUP BY p.id
-- HAVING COALESCE(SUM(s.quantity), 0) < p.reorder_level;

-- One sale invoice with its items:
-- SELECT s.invoice_no, c.name AS customer, p.name AS product,
--        i.quantity, i.unit_price, i.line_total, s.grand_total
-- FROM sales s
-- JOIN customers  c ON c.id = s.customer_id
-- JOIN sale_items i ON i.sale_id = s.id
-- JOIN products   p ON p.id = i.product_id
-- WHERE s.invoice_no = 'SAL-0001';

-- How Express should update stock when a sale is saved (inside a transaction):
-- INSERT INTO stocks (product_id, warehouse_id, quantity)
-- VALUES ($1, $2, -$3)
-- ON CONFLICT (product_id, warehouse_id)
-- DO UPDATE SET quantity = stocks.quantity + EXCLUDED.quantity, updated_at = NOW();
