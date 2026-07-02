export function mapBatch(row) {
  return {
    id: row.id,
    item_id: row.item_id,
    expiry_date: row.expiry_date,
    quantity: row.quantity,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findByItemId(db, itemId) {
  const result = await db.query(
    `SELECT *
     FROM item_batches
     WHERE item_id = $1
     ORDER BY expiry_date ASC`,
    [itemId]
  );

  return result.rows.map(mapBatch);
}

export async function syncItemStockFromBatches(client, itemId) {
  const result = await client.query(
    `UPDATE items
     SET current_stock = COALESCE(
       (SELECT SUM(quantity)::int FROM item_batches WHERE item_id = $1),
       0
     )
     WHERE id = $1
     RETURNING current_stock`,
    [itemId]
  );

  return result.rows[0]?.current_stock ?? 0;
}

export async function addToBatch(client, itemId, expiryDate, quantity) {
  const result = await client.query(
    `INSERT INTO item_batches (item_id, expiry_date, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (item_id, expiry_date)
     DO UPDATE SET
       quantity = item_batches.quantity + EXCLUDED.quantity,
       updated_at = NOW()
     RETURNING *`,
    [itemId, expiryDate, quantity]
  );

  return mapBatch(result.rows[0]);
}

export async function deductFromBatches(client, itemId, quantity) {
  const batchResult = await client.query(
    `SELECT id, quantity, expiry_date
     FROM item_batches
     WHERE item_id = $1 AND quantity > 0
     ORDER BY expiry_date ASC
     FOR UPDATE`,
    [itemId]
  );

  let remaining = quantity;
  const deductions = [];

  for (const batch of batchResult.rows) {
    if (remaining <= 0) break;

    const deduct = Math.min(batch.quantity, remaining);
    await client.query(
      `UPDATE item_batches
       SET quantity = quantity - $1, updated_at = NOW()
       WHERE id = $2`,
      [deduct, batch.id]
    );

    deductions.push({ batch_id: batch.id, quantity: deduct, expiry_date: batch.expiry_date });
    remaining -= deduct;
  }

  return { deductions, remaining };
}

export async function createInitialBatch(client, itemId, expiryDate, quantity) {
  if (!quantity || quantity <= 0) return null;
  return addToBatch(client, itemId, expiryDate, quantity);
}
