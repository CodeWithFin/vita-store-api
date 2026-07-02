import { AppError } from '../../utils/errors.js';
import * as batchesRepo from '../items/batches.js';

function mapMovement(row) {
  const movement = {
    id: row.id,
    item_id: row.item_id,
    batch_id: row.batch_id ?? null,
    type: row.type,
    quantity: row.quantity,
    reason: row.reason,
    expiry_date: row.expiry_date ?? null,
    created_at: row.created_at,
  };

  if (row.item_sku !== undefined || row.item_name) {
    movement.item = {
      id: row.item_id,
      sku: row.item_sku ?? null,
      name: row.item_name,
    };
  }

  return movement;
}

function mapItem(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    description: row.description,
    category: row.category,
    product_type: row.product_type,
    amount: row.amount,
    amount_unit: row.amount_unit,
    cost_price: row.cost_price,
    selling_price: row.selling_price,
    current_stock: row.current_stock,
    min_stock_level: row.min_stock_level,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function resolveSignedQuantity(type, quantity) {
  const absQuantity = Math.abs(quantity);

  switch (type) {
    case 'IN':
      if (quantity <= 0) {
        throw new AppError(400, 'IN movements require a positive quantity');
      }
      return absQuantity;
    case 'OUT':
      if (quantity <= 0) {
        throw new AppError(400, 'OUT movements require a positive quantity');
      }
      return -absQuantity;
    case 'ADJUSTMENT':
      if (quantity === 0) {
        throw new AppError(400, 'ADJUSTMENT quantity cannot be zero');
      }
      return quantity;
    default:
      throw new AppError(400, 'Invalid movement type');
  }
}

async function applySkincareBatchChange(client, item, type, signedQuantity, expiryDate) {
  if (type === 'IN') {
    if (!expiryDate) {
      throw new AppError(400, 'Expiry date is required when receiving skincare stock');
    }

    const batch = await batchesRepo.addToBatch(client, item.id, expiryDate, signedQuantity);
    await batchesRepo.syncItemStockFromBatches(client, item.id);
    return { batch_id: batch.id, expiry_date: expiryDate };
  }

  if (type === 'OUT') {
    const { deductions, remaining } = await batchesRepo.deductFromBatches(
      client,
      item.id,
      Math.abs(signedQuantity)
    );

    if (remaining > 0) {
      throw new AppError(400, 'Insufficient stock for this movement');
    }

    await batchesRepo.syncItemStockFromBatches(client, item.id);
    return {
      batch_id: deductions[0]?.batch_id ?? null,
      expiry_date: deductions[0]?.expiry_date ?? null,
    };
  }

  if (signedQuantity > 0) {
    if (!expiryDate) {
      throw new AppError(400, 'Expiry date is required when increasing skincare stock');
    }

    const batch = await batchesRepo.addToBatch(client, item.id, expiryDate, signedQuantity);
    await batchesRepo.syncItemStockFromBatches(client, item.id);
    return { batch_id: batch.id, expiry_date: expiryDate };
  }

  const { remaining } = await batchesRepo.deductFromBatches(
    client,
    item.id,
    Math.abs(signedQuantity)
  );

  if (remaining > 0) {
    throw new AppError(400, 'Insufficient stock for this adjustment');
  }

  await batchesRepo.syncItemStockFromBatches(client, item.id);
  return { batch_id: null, expiry_date: null };
}

export async function createMovement(db, { item_id, type, quantity, reason, expiry_date }) {
  const signedQuantity = resolveSignedQuantity(type, quantity);
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const itemResult = await client.query(
      `SELECT *
       FROM items
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [item_id]
    );

    if (itemResult.rowCount === 0) {
      throw new AppError(404, 'Item not found');
    }

    const item = itemResult.rows[0];
    let batchMeta = { batch_id: null, expiry_date: expiry_date ?? null };

    if (item.product_type === 'skincare') {
      batchMeta = await applySkincareBatchChange(client, item, type, signedQuantity, expiry_date);
    } else {
      const newStock = item.current_stock + signedQuantity;
      if (newStock < 0) {
        throw new AppError(400, 'Insufficient stock for this movement');
      }

      await client.query(`UPDATE items SET current_stock = $1 WHERE id = $2`, [newStock, item_id]);
    }

    const movementResult = await client.query(
      `INSERT INTO movements (item_id, batch_id, type, quantity, reason, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [item_id, batchMeta.batch_id, type, signedQuantity, reason, batchMeta.expiry_date]
    );

    const updatedItemResult = await client.query(`SELECT * FROM items WHERE id = $1`, [item_id]);

    await client.query('COMMIT');

    return {
      movement: mapMovement(movementResult.rows[0]),
      item: mapItem(updatedItemResult.rows[0]),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findAll(db, { itemId, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (itemId) {
    conditions.push(`m.item_id = $${paramIndex++}`);
    params.push(itemId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM movements m
     ${whereClause}`,
    params
  );

  const total = countResult.rows[0].total;
  const dataParams = [...params, limit, offset];

  const result = await db.query(
    `SELECT m.*, i.sku AS item_sku, i.name AS item_name
     FROM movements m
     JOIN items i ON i.id = m.item_id
     ${whereClause}
     ORDER BY m.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    dataParams
  );

  return {
    data: result.rows.map(mapMovement),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit) || 0,
    },
  };
}
