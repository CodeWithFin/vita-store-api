DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('skincare', 'makeup');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE items ADD COLUMN IF NOT EXISTS product_type product_type NOT NULL DEFAULT 'makeup';
ALTER TABLE items ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS amount_unit VARCHAR(2);

ALTER TABLE items ALTER COLUMN sku DROP NOT NULL;

UPDATE items
SET product_type = 'skincare'
WHERE LOWER(category) IN ('skincare', 'skin care', 'skin-care')
  AND product_type = 'makeup';

UPDATE items
SET product_type = 'makeup'
WHERE LOWER(category) IN ('makeup', 'make up', 'make-up')
  AND product_type = 'makeup';

CREATE TABLE IF NOT EXISTS item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, expiry_date)
);

CREATE INDEX IF NOT EXISTS idx_item_batches_item_id ON item_batches (item_id);
CREATE INDEX IF NOT EXISTS idx_item_batches_expiry ON item_batches (expiry_date);
CREATE INDEX IF NOT EXISTS idx_items_product_type ON items (product_type);

ALTER TABLE movements ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES item_batches (id);
ALTER TABLE movements ADD COLUMN IF NOT EXISTS expiry_date DATE;

CREATE OR REPLACE FUNCTION update_item_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_item_batches_updated_at
    BEFORE UPDATE ON item_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_item_batches_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
