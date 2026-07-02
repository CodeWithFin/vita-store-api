ALTER TABLE items ADD COLUMN IF NOT EXISTS brand VARCHAR(100);

UPDATE items
SET brand = 'Vitapharm'
WHERE brand IS NULL OR TRIM(brand) = '';

ALTER TABLE items ALTER COLUMN brand SET DEFAULT 'Vitapharm';
ALTER TABLE items ALTER COLUMN brand SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_brand ON items (brand);
