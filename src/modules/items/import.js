import * as XLSX from 'xlsx';
import { AppError } from '../../utils/errors.js';

const COLUMN_ALIASES = {
  sku: ['sku', 'product code', 'product_code', 'code', 'item code', 'item_code'],
  name: ['name', 'product name', 'product_name', 'product', 'item name', 'item_name'],
  category: ['category', 'product category', 'product_category', 'type'],
  min_stock_level: [
    'min stock level',
    'min_stock_level',
    'minimum stock',
    'minimum_stock',
    'min stock',
    'min_stock',
    'reorder level',
    'reorder_level',
  ],
  description: ['description', 'notes', 'details', 'product description', 'product_description'],
};

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function mapHeaders(headerRow) {
  const mapping = {};

  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    if (!normalized) return;

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(normalized)) {
        mapping[field] = index;
      }
    }
  });

  return mapping;
}

function cellText(row, index) {
  if (index === undefined) return '';
  const value = row[index];
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(num) ? num : NaN;
}

function isBlankRow(row) {
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
}

function validateItemRow(rowNumber, item) {
  const issues = [];

  if (!item.sku) issues.push('Product code is required');
  else if (item.sku.length > 100) issues.push('Product code must be 100 characters or less');

  if (!item.name) issues.push('Name is required');
  else if (item.name.length > 255) issues.push('Name must be 255 characters or less');

  if (!item.category) issues.push('Category is required');
  else if (item.category.length > 100) issues.push('Category must be 100 characters or less');

  if (item.min_stock_level !== null && (!Number.isFinite(item.min_stock_level) || item.min_stock_level < 0)) {
    issues.push('Min stock level must be a whole number greater than or equal to 0');
  }

  if (issues.length) {
    return { row: rowNumber, sku: item.sku || '—', message: issues.join('; ') };
  }

  return null;
}

export function buildImportTemplateBuffer() {
  const headers = ['SKU', 'Name', 'Category', 'Min Stock Level', 'Description'];
  const example = [
    'VIT-001',
    'Vitamin C Tablets',
    'Supplements',
    10,
    'Optional notes about this product',
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function parseItemsSpreadsheet(buffer) {
  let workbook;

  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw new AppError(400, 'Could not read the uploaded file. Please use a valid Excel or CSV file.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new AppError(400, 'The uploaded file does not contain any sheets.');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  });

  if (rows.length < 2) {
    throw new AppError(
      400,
      'The file must include a header row and at least one product row.'
    );
  }

  const mapping = mapHeaders(rows[0]);
  const requiredColumns = ['sku', 'name', 'category'];
  const missingColumns = requiredColumns.filter((field) => mapping[field] === undefined);

  if (missingColumns.length) {
    throw new AppError(
      400,
      `Missing required columns: ${missingColumns.join(', ')}. Download the template for the correct format.`
    );
  }

  const items = [];
  const errors = [];
  const seenSkus = new Set();

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index];
    if (isBlankRow(row)) continue;

    const rowNumber = index + 1;
    const sku = cellText(row, mapping.sku);
    const minStockRaw = mapping.min_stock_level !== undefined ? row[mapping.min_stock_level] : '';
    const minStockParsed = parseInteger(minStockRaw);

    const item = {
      sku,
      name: cellText(row, mapping.name),
      category: cellText(row, mapping.category),
      description: cellText(row, mapping.description) || null,
      min_stock_level: minStockRaw === '' || minStockRaw === null || minStockRaw === undefined ? 5 : minStockParsed,
    };

    const validationError = validateItemRow(rowNumber, item);
    if (validationError) {
      errors.push(validationError);
      continue;
    }

    const skuKey = item.sku.toLowerCase();
    if (seenSkus.has(skuKey)) {
      errors.push({
        row: rowNumber,
        sku: item.sku,
        message: 'Duplicate product code in this file',
      });
      continue;
    }

    seenSkus.add(skuKey);
    items.push({ ...item, _sourceRow: rowNumber });
  }

  return { items, errors };
}
