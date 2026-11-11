BEGIN;

-- Additive migration for the Warehouses and Stocks sections.
-- Safe to run more than once. Does not drop or recreate existing application tables.

ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type VARCHAR(30) NOT NULL,
  quantity_delta NUMERIC(14,2) NOT NULL CHECK (quantity_delta <> 0),
  source_type VARCHAR(40) NOT NULL,
  source_id BIGINT,
  source_item_id INTEGER,
  reference_no VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_warehouse ON stock_movements(product_id, warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_source ON stock_movements(source_type, source_id);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGSERIAL PRIMARY KEY,
  adjustment_no VARCHAR(40) NOT NULL UNIQUE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_delta NUMERIC(14,2) NOT NULL CHECK (quantity_delta <> 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id BIGSERIAL PRIMARY KEY,
  transfer_no VARCHAR(40) NOT NULL UNIQUE,
  source_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  destination_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_warehouse_id <> destination_warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id BIGSERIAL PRIMARY KEY,
  transfer_id BIGINT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer ON stock_transfer_items(transfer_id);

-- Keep a third warehouse available without changing the total quantity already in the system.
INSERT INTO warehouses (name, location)
VALUES ('Regional Warehouse', 'Kabul - Regional Storage')
ON CONFLICT (name) DO NOTHING;

-- Distribute 15% of each existing Main Warehouse balance to the new warehouse.
-- Total company stock remains unchanged. This only runs when the regional warehouse
-- has no stock yet, making the migration safe to rerun.
DO $$
DECLARE
  v_main_id INTEGER;
  v_regional_id INTEGER;
  v_stock RECORD;
  v_quantity NUMERIC(14,2);
BEGIN
  SELECT id INTO v_main_id FROM warehouses WHERE name = 'Main Warehouse' LIMIT 1;
  SELECT id INTO v_regional_id FROM warehouses WHERE name = 'Regional Warehouse' LIMIT 1;

  IF v_main_id IS NOT NULL AND v_regional_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM stocks WHERE warehouse_id = v_regional_id AND quantity <> 0) THEN
    FOR v_stock IN
      SELECT product_id, quantity FROM stocks
      WHERE warehouse_id = v_main_id AND quantity > 0
      ORDER BY product_id
    LOOP
      v_quantity := ROUND(v_stock.quantity * 0.15, 2);
      IF v_quantity > 0 THEN
        UPDATE stocks
        SET quantity = quantity - v_quantity, updated_at = NOW()
        WHERE product_id = v_stock.product_id AND warehouse_id = v_main_id;

        INSERT INTO stocks (product_id, warehouse_id, quantity)
        VALUES (v_stock.product_id, v_regional_id, v_quantity)
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = stocks.quantity + EXCLUDED.quantity, updated_at = NOW();

        INSERT INTO stock_movements
          (warehouse_id, product_id, movement_type, quantity_delta, source_type, reference_no, notes)
        VALUES
          (v_main_id, v_stock.product_id, 'transfer_out', -v_quantity, 'opening_distribution', 'MIGRATION-001', 'Initial distribution to Regional Warehouse'),
          (v_regional_id, v_stock.product_id, 'transfer_in', v_quantity, 'opening_distribution', 'MIGRATION-001', 'Initial distribution from Main Warehouse');
      END IF;
    END LOOP;
  END IF;
END $$;

-- Backfill the ledger from existing documents. This is idempotent by source item.
INSERT INTO stock_movements
  (warehouse_id, product_id, movement_type, quantity_delta, source_type, source_id, source_item_id, reference_no, created_at)
SELECT p.warehouse_id, pi.product_id, 'purchase', pi.quantity, 'purchase', p.id, pi.id, p.invoice_no, p.created_at
FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id
WHERE NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.source_type = 'purchase' AND m.source_item_id = pi.id);

INSERT INTO stock_movements
  (warehouse_id, product_id, movement_type, quantity_delta, source_type, source_id, source_item_id, reference_no, created_at)
SELECT s.warehouse_id, si.product_id, 'sale', -si.quantity, 'sale', s.id, si.id, s.invoice_no, s.created_at
FROM sale_items si JOIN sales s ON s.id = si.sale_id
WHERE NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.source_type = 'sale' AND m.source_item_id = si.id);

INSERT INTO stock_movements
  (warehouse_id, product_id, movement_type, quantity_delta, source_type, source_id, source_item_id, reference_no, created_at)
SELECT sr.warehouse_id, sri.product_id, 'sale_return', sri.quantity, 'sale_return', sr.id, sri.id, sr.return_no, sr.created_at
FROM sale_return_items sri JOIN sale_returns sr ON sr.id = sri.sale_return_id
WHERE NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.source_type = 'sale_return' AND m.source_item_id = sri.id);

INSERT INTO stock_movements
  (warehouse_id, product_id, movement_type, quantity_delta, source_type, source_id, source_item_id, reference_no, created_at)
SELECT pr.warehouse_id, pri.product_id, 'purchase_return', -pri.quantity, 'purchase_return', pr.id, pri.id, pr.return_no, pr.created_at
FROM purchase_return_items pri JOIN purchase_returns pr ON pr.id = pri.purchase_return_id
WHERE NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.source_type = 'purchase_return' AND m.source_item_id = pri.id);

-- Automatically record later document item inserts, updates and deletes. The existing
-- document services remain responsible for changing stocks inside their transactions.
CREATE OR REPLACE FUNCTION apply_document_stock_delta(
  p_warehouse_id INTEGER,
  p_product_id INTEGER,
  p_delta NUMERIC(14,2)
)
RETURNS VOID AS $$
DECLARE
  v_updated_id INTEGER;
BEGIN
  IF p_delta > 0 THEN
    INSERT INTO stocks (product_id, warehouse_id, quantity)
    VALUES (p_product_id, p_warehouse_id, p_delta)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = stocks.quantity + EXCLUDED.quantity, updated_at = NOW();
  ELSIF p_delta < 0 THEN
    UPDATE stocks
    SET quantity = quantity + p_delta, updated_at = NOW()
    WHERE product_id = p_product_id
      AND warehouse_id = p_warehouse_id
      AND quantity + p_delta >= 0
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = format('Insufficient stock for product %s in warehouse %s', p_product_id, p_warehouse_id);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_document_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_source_type VARCHAR(40);
  v_movement_type VARCHAR(30);
  v_parent_table VARCHAR(40);
  v_parent_column VARCHAR(40);
  v_reference_column VARCHAR(40);
  v_effect_sign NUMERIC(1,0);
  v_parent_id INTEGER;
  v_warehouse_id INTEGER;
  v_reference_no VARCHAR(50);
  v_last_delta NUMERIC(14,2);
  v_product_id INTEGER;
  v_quantity NUMERIC(14,2);
  v_delta NUMERIC(14,2);
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'purchase_items' THEN
      v_source_type := 'purchase'; v_movement_type := 'purchase';
      v_parent_table := 'purchases'; v_parent_column := 'purchase_id'; v_reference_column := 'invoice_no'; v_effect_sign := 1;
    WHEN 'sale_items' THEN
      v_source_type := 'sale'; v_movement_type := 'sale';
      v_parent_table := 'sales'; v_parent_column := 'sale_id'; v_reference_column := 'invoice_no'; v_effect_sign := -1;
    WHEN 'sale_return_items' THEN
      v_source_type := 'sale_return'; v_movement_type := 'sale_return';
      v_parent_table := 'sale_returns'; v_parent_column := 'sale_return_id'; v_reference_column := 'return_no'; v_effect_sign := 1;
    WHEN 'purchase_return_items' THEN
      v_source_type := 'purchase_return'; v_movement_type := 'purchase_return';
      v_parent_table := 'purchase_returns'; v_parent_column := 'purchase_return_id'; v_reference_column := 'return_no'; v_effect_sign := -1;
    ELSE
      RAISE EXCEPTION 'Unsupported stock movement source table: %', TG_TABLE_NAME;
  END CASE;

  -- Reverse the latest recorded effect for the old item. Looking up the original
  -- warehouse from the ledger is important when a return header has already been
  -- moved to another warehouse as part of an edit, or when a parent is deleted.
  IF TG_OP <> 'INSERT' THEN
    SELECT warehouse_id, reference_no, quantity_delta
      INTO v_warehouse_id, v_reference_no, v_last_delta
    FROM stock_movements
    WHERE source_type = v_source_type AND source_item_id = OLD.id
    ORDER BY id DESC
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
      v_parent_id := (to_jsonb(OLD)->>v_parent_column)::INTEGER;
      EXECUTE format('SELECT warehouse_id, %I FROM %I WHERE id = $1', v_reference_column, v_parent_table)
        INTO v_warehouse_id, v_reference_no USING v_parent_id;
      v_last_delta := OLD.quantity * v_effect_sign;
    END IF;

    IF v_warehouse_id IS NOT NULL AND v_last_delta IS NOT NULL AND v_last_delta <> 0 THEN
      v_parent_id := (to_jsonb(OLD)->>v_parent_column)::INTEGER;
      IF v_source_type IN ('purchase', 'sale') THEN
        PERFORM apply_document_stock_delta(v_warehouse_id, OLD.product_id, -v_last_delta);
      END IF;
      INSERT INTO stock_movements
        (warehouse_id, product_id, movement_type, quantity_delta, source_type, source_id, source_item_id, reference_no, notes)
      VALUES
        (v_warehouse_id, OLD.product_id, v_movement_type, -v_last_delta, v_source_type, v_parent_id, OLD.id, v_reference_no, 'Previous document line effect reversed');
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    v_parent_id := (to_jsonb(NEW)->>v_parent_column)::INTEGER;
    EXECUTE format('SELECT warehouse_id, %I FROM %I WHERE id = $1', v_reference_column, v_parent_table)
      INTO v_warehouse_id, v_reference_no USING v_parent_id;
    v_delta := NEW.quantity * v_effect_sign;
    IF v_source_type IN ('purchase', 'sale') THEN
      PERFORM apply_document_stock_delta(v_warehouse_id, NEW.product_id, v_delta);
    END IF;
    INSERT INTO stock_movements
      (warehouse_id, product_id, movement_type, quantity_delta, source_type, source_id, source_item_id, reference_no)
    VALUES
      (v_warehouse_id, NEW.product_id, v_movement_type, v_delta, v_source_type, v_parent_id, NEW.id, v_reference_no);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_items_stock_movement ON purchase_items;
CREATE TRIGGER trg_purchase_items_stock_movement AFTER INSERT OR UPDATE OR DELETE ON purchase_items
FOR EACH ROW EXECUTE FUNCTION record_document_stock_movement();

DROP TRIGGER IF EXISTS trg_sale_items_stock_movement ON sale_items;
CREATE TRIGGER trg_sale_items_stock_movement AFTER INSERT OR UPDATE OR DELETE ON sale_items
FOR EACH ROW EXECUTE FUNCTION record_document_stock_movement();

DROP TRIGGER IF EXISTS trg_sale_return_items_stock_movement ON sale_return_items;
CREATE TRIGGER trg_sale_return_items_stock_movement AFTER INSERT OR UPDATE OR DELETE ON sale_return_items
FOR EACH ROW EXECUTE FUNCTION record_document_stock_movement();

DROP TRIGGER IF EXISTS trg_purchase_return_items_stock_movement ON purchase_return_items;
CREATE TRIGGER trg_purchase_return_items_stock_movement AFTER INSERT OR UPDATE OR DELETE ON purchase_return_items
FOR EACH ROW EXECUTE FUNCTION record_document_stock_movement();

COMMIT;
