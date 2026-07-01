export async function getMetrics(db) {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total_items,
       COALESCE(SUM(current_stock * cost_price), 0)::numeric(14, 2) AS total_inventory_value,
       COUNT(*) FILTER (WHERE current_stock <= min_stock_level)::int AS low_stock_count
     FROM items
     WHERE deleted_at IS NULL`
  );

  const row = result.rows[0];

  return {
    total_items: row.total_items,
    total_inventory_value: row.total_inventory_value,
    low_stock_count: row.low_stock_count,
  };
}
