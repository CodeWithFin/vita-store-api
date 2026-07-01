import { AppError } from '../../utils/errors.js';

function mapItem(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    category: row.category,
    cost_price: row.cost_price,
    selling_price: row.selling_price,
    current_stock: row.current_stock,
    min_stock_level: row.min_stock_level,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findAll(db, { category, search, lowStock }) {
  const conditions = ['deleted_at IS NULL'];
  const params = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`category = $${paramIndex++}`);
    params.push(category);
  }

  if (search) {
    conditions.push(
      `(name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
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
  const result = await db.query(
    `INSERT INTO items (sku, name, description, category, cost_price, selling_price, min_stock_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.sku,
      data.name,
      data.description ?? null,
      data.category,
      data.cost_price ?? 0,
      data.selling_price ?? 0,
      data.min_stock_level ?? 5,
    ]
  );

  return mapItem(result.rows[0]);
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
          sku: item.sku,
          message: 'A product with this code already exists',
        });
      } else {
        errors.push({
          row: rowNumber,
          sku: item.sku,
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
  const result = await db.query(
    `SELECT 1 FROM movements WHERE item_id = $1 LIMIT 1`,
    [itemId]
  );
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
