CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
CREATE TYPE product_type AS ENUM ('skincare', 'makeup');

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL DEFAULT 'Vitapharm',
    description TEXT,
    category VARCHAR(100) NOT NULL,
    product_type product_type NOT NULL DEFAULT 'makeup',
    amount NUMERIC(10, 2) CHECK (amount IS NULL OR amount > 0),
    amount_unit VARCHAR(2) CHECK (amount_unit IS NULL OR amount_unit IN ('ml', 'g')),
    cost_price NUMERIC(10, 2) NOT NULL CHECK (cost_price >= 0) DEFAULT 0,
    selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0) DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_level INTEGER NOT NULL DEFAULT 5 CHECK (min_stock_level >= 0),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_sku ON items (sku);
CREATE INDEX idx_items_brand ON items (brand);
CREATE INDEX idx_items_category ON items (category);
CREATE INDEX idx_items_product_type ON items (product_type);
CREATE INDEX idx_items_deleted_at ON items (deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (item_id, expiry_date)
);

CREATE INDEX idx_item_batches_item_id ON item_batches (item_id);
CREATE INDEX idx_item_batches_expiry ON item_batches (expiry_date);

CREATE TABLE movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items (id),
    batch_id UUID REFERENCES item_batches (id),
    type movement_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity <> 0),
    reason VARCHAR(255) NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_item_id ON movements (item_id);
CREATE INDEX idx_movements_created_at ON movements (created_at DESC);

CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_items_updated_at();

CREATE OR REPLACE FUNCTION update_item_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_batches_updated_at
    BEFORE UPDATE ON item_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_item_batches_updated_at();
