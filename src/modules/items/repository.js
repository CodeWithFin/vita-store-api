import { randomBytes } from 'node:crypto';
import { AppError } from '../../utils/errors.js';
import * as batchesRepo from './batches.js';

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

async function generateSkincareSku(db) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = randomBytes(4).toString('hex').toUpperCase();
    const sku = `SKC-${suffix}`;
    const existing = await db.query(`SELECT 1 FROM items WHERE sku = $1 LIMIT 1`, [sku]);
    if (existing.rowCount === 0) return sku;
  }

  throw new AppError(500, 'Could not generate a unique product code');
}

export async function findAll(db, { productType, brand, category, search, lowStock }) {
  const conditions = ['deleted_at IS NULL'];
  const params = [];
  let paramIndex = 1;

  if (productType) {
    conditions.push(`product_type = $${paramIndex++}`);
    params.push(productType);
  }

  if (brand) {
    conditions.push(`brand ILIKE $${paramIndex++}`);
    params.push(brand);
  }

  if (category) {
    conditions.push(`category ILIKE $${paramIndex++}`);
    params.push(category);
  }

  if (search) {
    conditions.push(
      `(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR brand ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
    );
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (lowStock) {
    conditions.push('current_stock <= min_stock_level');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT *
     FROM items
     ${whereClause}
     ORDER BY name ASC`,
    params
  );

  return result.rows.map(mapItem);
}

export async function findByIdOrSku(db, identifier) {
  const result = await db.query(
    `SELECT *
     FROM items
     WHERE deleted_at IS NULL
       AND (id::text = $1 OR sku = $1)
     LIMIT 1`,
    [identifier]
  );

  return result.rows[0] ? mapItem(result.rows[0]) : null;
}

export async function create(db, data) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const sku =
      data.product_type === 'skincare'
        ? data.sku || (await generateSkincareSku(client))
        : data.sku;

    const initialStock = data.product_type === 'makeup' ? data.initial_stock ?? 0 : 0;

    const result = await client.query(
      `INSERT INTO items (
         sku, name, brand, description, category, product_type, amount, amount_unit,
         cost_price, selling_price, current_stock, min_stock_level
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        sku,
        data.name,
        data.brand ?? 'Vitapharm',
        data.description ?? null,
        data.category,
        data.product_type,
        data.amount ?? null,
        data.amount_unit ?? null,
        data.cost_price ?? 0,
        data.selling_price ?? 0,
        initialStock,
        data.min_stock_level ?? 5,
      ]
    );

    const item = mapItem(result.rows[0]);

    if (data.product_type === 'makeup' && initialStock > 0) {
      await client.query(
        `INSERT INTO movements (item_id, type, quantity, reason)
         VALUES ($1, 'IN', $2, $3)`,
        [item.id, initialStock, 'Initial stock']
      );
    }

    if (data.product_type === 'skincare' && data.initial_stock > 0) {
      await batchesRepo.createInitialBatch(
        client,
        item.id,
        data.expiry_date,
        data.initial_stock
      );
      await client.query(
        `INSERT INTO movements (item_id, type, quantity, reason, expiry_date)
         VALUES ($1, 'IN', $2, $3, $4)`,
        [item.id, data.initial_stock, 'Initial stock', data.expiry_date]
      );
      await batchesRepo.syncItemStockFromBatches(client, item.id);
      const refreshed = await client.query(`SELECT * FROM items WHERE id = $1`, [item.id]);
      Object.assign(item, mapItem(refreshed.rows[0]));
    }

    await client.query('COMMIT');
    return item;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function createMany(db, items) {
  const created = [];
  const errors = [];

  for (let index = 0; index < items.length; index++) {
    const { _sourceRow, ...item } = items[index];
    const rowNumber = _sourceRow ?? index + 2;

    try {
      const createdItem = await create(db, item);
      created.push(createdItem);
    } catch (err) {
      if (err.code === '23505') {
        errors.push({
          row: rowNumber,
          sku: item.sku || item.name || '—',
          message: 'A product with this code already exists',
        });
      } else {
        errors.push({
          row: rowNumber,
          sku: item.sku || item.name || '—',
          message: err.message || 'Could not add this product',
        });
      }
    }
  }

  return { created, errors };
}

export async function update(db, id, data) {
  const fields = [];
  const params = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  }

  if (fields.length === 0) {
    throw new AppError(400, 'No valid fields provided for update');
  }

  params.push(id);

  const result = await db.query(
    `UPDATE items
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex} AND deleted_at IS NULL
     RETURNING *`,
    params
  );

  return result.rows[0] ? mapItem(result.rows[0]) : null;
}

export async function hasMovements(db, itemId) {
  const result = await db.query(`SELECT 1 FROM movements WHERE item_id = $1 LIMIT 1`, [itemId]);
  return result.rowCount > 0;
}

export async function remove(db, id) {
  const result = await db.query(
    `DELETE FROM items
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function softDelete(db, id) {
  const result = await db.query(
    `UPDATE items
     SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );

  return result.rows[0] ?? null;
}

export { batchesRepo };
