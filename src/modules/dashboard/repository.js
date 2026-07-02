const EXPIRY_WINDOW_DAYS = 90;

function mapExpiringBatch(row) {
  return {
    batch_id: row.batch_id,
    item_id: row.item_id,
    product_name: row.product_name,
    brand: row.brand,
    product_type: row.product_type,
    expiry_date: row.expiry_date,
    quantity: row.quantity,
    days_until_expiry: row.days_until_expiry,
    status:
      row.days_until_expiry < 0
        ? 'expired'
        : row.days_until_expiry <= 30
          ? 'critical'
          : 'warning',
  };
}

export async function getMetrics(db) {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total_items,
       COALESCE(SUM(current_stock * cost_price), 0)::numeric(14, 2) AS total_inventory_value,
       COUNT(*) FILTER (WHERE current_stock <= min_stock_level)::int AS low_stock_count,
       (
         SELECT COUNT(*)::int
         FROM item_batches b
         JOIN items i ON i.id = b.item_id
         WHERE i.deleted_at IS NULL
           AND b.quantity > 0
           AND b.expiry_date <= CURRENT_DATE + $1::int
       ) AS expiring_batch_count
     FROM items
     WHERE deleted_at IS NULL`,
    [EXPIRY_WINDOW_DAYS]
  );

  const row = result.rows[0];

  return {
    total_items: row.total_items,
    total_inventory_value: row.total_inventory_value,
    low_stock_count: row.low_stock_count,
    expiring_batch_count: row.expiring_batch_count,
  };
}

export async function getExpiringBatches(db, { days = EXPIRY_WINDOW_DAYS } = {}) {
  const windowDays = Number.isFinite(Number(days)) ? Math.max(1, Number(days)) : EXPIRY_WINDOW_DAYS;

  const result = await db.query(
    `SELECT
       b.id AS batch_id,
       i.id AS item_id,
       i.name AS product_name,
       i.brand,
       i.product_type,
       b.expiry_date,
       b.quantity,
       (b.expiry_date - CURRENT_DATE)::int AS days_until_expiry
     FROM item_batches b
     JOIN items i ON i.id = b.item_id
     WHERE i.deleted_at IS NULL
       AND b.quantity > 0
       AND b.expiry_date <= CURRENT_DATE + $1::int
     ORDER BY b.expiry_date ASC, i.name ASC`,
    [windowDays]
  );

  return result.rows.map(mapExpiringBatch);
}

export async function getBrands(db) {
  const result = await db.query(
    `SELECT
       brand,
       COUNT(*)::int AS product_count,
       COUNT(*) FILTER (WHERE product_type = 'skincare')::int AS skincare_count,
       COUNT(*) FILTER (WHERE product_type = 'makeup')::int AS makeup_count,
       COALESCE(SUM(current_stock), 0)::int AS total_pieces
     FROM items
     WHERE deleted_at IS NULL
     GROUP BY brand
     ORDER BY brand ASC`
  );

  return result.rows.map((row) => ({
    brand: row.brand,
    product_count: row.product_count,
    skincare_count: row.skincare_count,
    makeup_count: row.makeup_count,
    total_pieces: row.total_pieces,
  }));
}
