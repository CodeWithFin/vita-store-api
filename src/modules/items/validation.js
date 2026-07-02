import { AppError } from '../../utils/errors.js';

const PRODUCT_TYPES = new Set(['skincare', 'makeup']);
const AMOUNT_UNITS = new Set(['ml', 'g']);

export function normalizeProductType(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'skin care' || normalized === 'skin-care') return 'skincare';
  if (normalized === 'make up' || normalized === 'make-up') return 'makeup';
  return normalized;
}

export function validateCreateItem(data) {
  const productType = normalizeProductType(data.product_type);
  if (!PRODUCT_TYPES.has(productType)) {
    throw new AppError(400, 'Product type must be skincare or makeup');
  }

  const name = String(data.name ?? '').trim();
  if (!name) throw new AppError(400, 'Name is required');

  const brand = String(data.brand ?? 'Vitapharm').trim();
  if (!brand) throw new AppError(400, 'Brand is required');
  if (brand.length > 100) throw new AppError(400, 'Brand must be 100 characters or less');

  const description = data.description === undefined ? null : data.description;
  const minStockLevel =
    data.min_stock_level === undefined || data.min_stock_level === null
      ? 5
      : Number(data.min_stock_level);

  if (!Number.isInteger(minStockLevel) || minStockLevel < 0) {
    throw new AppError(400, 'Min stock level must be a whole number greater than or equal to 0');
  }

  const initialStock =
    data.initial_stock === undefined || data.initial_stock === null || data.initial_stock === ''
      ? 0
      : Number(data.initial_stock);

  if (!Number.isInteger(initialStock) || initialStock < 0) {
    throw new AppError(400, 'Total pieces must be a whole number greater than or equal to 0');
  }

  if (productType === 'skincare') {
    const amount = Number(data.amount);
    const amountUnit = String(data.amount_unit ?? '')
      .trim()
      .toLowerCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, 'Amount is required for skincare products');
    }

    if (!AMOUNT_UNITS.has(amountUnit)) {
      throw new AppError(400, 'Amount unit must be ml or g for skincare products');
    }

    if (initialStock > 0 && !data.expiry_date) {
      throw new AppError(
        400,
        'Expiry date is required when adding initial stock for skincare products'
      );
    }

    return {
      product_type: 'skincare',
      sku: null,
      name,
      brand,
      description: description ? String(description).trim() : null,
      category: 'Skincare',
      amount,
      amount_unit: amountUnit,
      min_stock_level: minStockLevel,
      initial_stock: initialStock,
      expiry_date: data.expiry_date ?? null,
    };
  }

  const sku = String(data.sku ?? '').trim();
  if (!sku) throw new AppError(400, 'Product code is required for makeup products');
  if (sku.length > 100) throw new AppError(400, 'Product code must be 100 characters or less');

  return {
    product_type: 'makeup',
    sku,
    name,
    brand,
    description: description ? String(description).trim() : null,
    category: 'Makeup',
    amount: null,
    amount_unit: null,
    min_stock_level: minStockLevel,
    initial_stock: initialStock,
    expiry_date: null,
  };
}

export function validateUpdateItem(existing, data) {
  const updates = {};
  const productType = existing.product_type;

  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw new AppError(400, 'Name cannot be empty');
    updates.name = name;
  }

  if (data.brand !== undefined) {
    const brand = String(data.brand).trim();
    if (!brand) throw new AppError(400, 'Brand cannot be empty');
    if (brand.length > 100) throw new AppError(400, 'Brand must be 100 characters or less');
    updates.brand = brand;
  }

  if (data.description !== undefined) {
    updates.description = data.description ? String(data.description).trim() : null;
  }

  if (data.min_stock_level !== undefined) {
    const minStockLevel = Number(data.min_stock_level);
    if (!Number.isInteger(minStockLevel) || minStockLevel < 0) {
      throw new AppError(400, 'Min stock level must be a whole number greater than or equal to 0');
    }
    updates.min_stock_level = minStockLevel;
  }

  if (productType === 'skincare') {
    if (data.amount !== undefined) {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(400, 'Amount must be greater than 0');
      }
      updates.amount = amount;
    }

    if (data.amount_unit !== undefined) {
      const amountUnit = String(data.amount_unit).trim().toLowerCase();
      if (!AMOUNT_UNITS.has(amountUnit)) {
        throw new AppError(400, 'Amount unit must be ml or g');
      }
      updates.amount_unit = amountUnit;
    }
  }

  if (productType === 'makeup' && data.sku !== undefined) {
    throw new AppError(400, 'Product code cannot be changed after creation');
  }

  return updates;
}
