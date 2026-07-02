import * as XLSX from 'xlsx';
import { AppError } from '../../utils/errors.js';
import { normalizeProductType } from './validation.js';

const SHARED_ALIASES = {
  name: ['name', 'product name', 'product_name', 'product', 'item name', 'item_name'],
  brand: ['brand', 'manufacturer', 'label', 'product brand', 'product_brand'],
  description: ['description', 'notes', 'details', 'product description', 'product_description'],
  initial_stock: [
    'total pieces',
    'total_pieces',
    'pieces',
    'stock',
    'quantity',
    'initial stock',
    'initial_stock',
    'current stock',
    'current_stock',
  ],
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
};

const MAKEUP_ALIASES = {
  ...SHARED_ALIASES,
  sku: ['sku', 'product code', 'product_code', 'code', 'item code', 'item_code'],
};

const SKINCARE_ALIASES = {
  ...SHARED_ALIASES,
  amount: ['amount', 'size', 'volume', 'weight'],
  amount_unit: ['unit', 'amount unit', 'amount_unit', 'measure'],
};

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function mapHeaders(headerRow, productType) {
  const aliases = productType === 'skincare' ? SKINCARE_ALIASES : MAKEUP_ALIASES;
  const mapping = {};

  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    if (!normalized) return;

    for (const [field, fieldAliases] of Object.entries(aliases)) {
      if (fieldAliases.includes(normalized)) {
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

function parseAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number.parseFloat(String(value).trim());
  return Number.isFinite(num) ? num : NaN;
}

function isBlankRow(row) {
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
}

function validateMakeupRow(rowNumber, item) {
  const issues = [];

  if (!item.sku) issues.push('Product code is required');
  else if (item.sku.length > 100) issues.push('Product code must be 100 characters or less');

  if (!item.name) issues.push('Name is required');
  else if (item.name.length > 255) issues.push('Name must be 255 characters or less');

  if (item.initial_stock !== null && (!Number.isFinite(item.initial_stock) || item.initial_stock < 0)) {
    issues.push('Total pieces must be a whole number greater than or equal to 0');
  }

  if (item.min_stock_level !== null && (!Number.isFinite(item.min_stock_level) || item.min_stock_level < 0)) {
    issues.push('Min stock level must be a whole number greater than or equal to 0');
  }

  if (issues.length) {
    return { row: rowNumber, sku: item.sku || '—', message: issues.join('; ') };
  }

  return null;
}

function validateSkincareRow(rowNumber, item) {
  const issues = [];

  if (!item.name) issues.push('Name is required');
  else if (item.name.length > 255) issues.push('Name must be 255 characters or less');

  if (!Number.isFinite(item.amount) || item.amount <= 0) {
    issues.push('Amount is required and must be greater than 0');
  }

  const unit = String(item.amount_unit ?? '').toLowerCase();
  if (!['ml', 'g'].includes(unit)) {
    issues.push('Unit must be ml or g');
  }

  if (item.initial_stock !== null && (!Number.isFinite(item.initial_stock) || item.initial_stock < 0)) {
    issues.push('Total pieces must be a whole number greater than or equal to 0');
  }

  if (item.min_stock_level !== null && (!Number.isFinite(item.min_stock_level) || item.min_stock_level < 0)) {
    issues.push('Min stock level must be a whole number greater than or equal to 0');
  }

  if (issues.length) {
    return { row: rowNumber, sku: item.name || '—', message: issues.join('; ') };
  }

  return null;
}

export function buildImportTemplateBuffer(productType = 'makeup') {
  if (productType === 'skincare') {
    const headers = ['Name', 'Brand', 'Description', 'Amount', 'Unit', 'Total Pieces', 'Min Stock Level'];
    const example = [
      'Hydrating Face Cream',
      'Vitapharm',
      'Daily moisturizer for all skin types',
      50,
      'ml',
      0,
      5,
    ];
    const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Skincare');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  const headers = ['Product Code', 'Name', 'Brand', 'Description', 'Total Pieces', 'Min Stock Level'];
  const example = ['MKP-001', 'Matte Lipstick Rose', 'Vitapharm', 'Long-wear matte finish', 0, 5];
  const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Makeup');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function parseItemsSpreadsheet(buffer, productTypeInput = 'makeup') {
  const productType = normalizeProductType(productTypeInput);
  if (!['skincare', 'makeup'].includes(productType)) {
    throw new AppError(400, 'Import type must be skincare or makeup');
  }

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
    throw new AppError(400, 'The file must include a header row and at least one product row.');
  }

  const mapping = mapHeaders(rows[0], productType);
  const requiredColumns =
    productType === 'skincare' ? ['name', 'amount', 'amount_unit'] : ['sku', 'name'];
  const missingColumns = requiredColumns.filter((field) => mapping[field] === undefined);

  if (missingColumns.length) {
    throw new AppError(
      400,
      `Missing required columns: ${missingColumns.join(', ')}. Download the ${productType} template for the correct format.`
    );
  }

  const items = [];
  const errors = [];
  const seenKeys = new Set();

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index];
    if (isBlankRow(row)) continue;

    const rowNumber = index + 1;
    const minStockRaw = mapping.min_stock_level !== undefined ? row[mapping.min_stock_level] : '';
    const minStockParsed = parseInteger(minStockRaw);
    const initialStockRaw = mapping.initial_stock !== undefined ? row[mapping.initial_stock] : '';
    const initialStockParsed = parseInteger(initialStockRaw);

    let item;
    let validationError;
    let dedupeKey;

    if (productType === 'skincare') {
      item = {
        product_type: 'skincare',
        name: cellText(row, mapping.name),
        brand: cellText(row, mapping.brand) || 'Vitapharm',
        description: cellText(row, mapping.description) || null,
        amount: parseAmount(row[mapping.amount]),
        amount_unit: cellText(row, mapping.amount_unit).toLowerCase(),
        category: 'Skincare',
        initial_stock: initialStockRaw === '' ? 0 : initialStockParsed,
        min_stock_level: minStockRaw === '' ? 5 : minStockParsed,
      };
      validationError = validateSkincareRow(rowNumber, item);
      dedupeKey = item.name.toLowerCase();
    } else {
      item = {
        product_type: 'makeup',
        sku: cellText(row, mapping.sku),
        name: cellText(row, mapping.name),
        brand: cellText(row, mapping.brand) || 'Vitapharm',
        description: cellText(row, mapping.description) || null,
        category: 'Makeup',
        initial_stock: initialStockRaw === '' ? 0 : initialStockParsed,
        min_stock_level: minStockRaw === '' ? 5 : minStockParsed,
      };
      validationError = validateMakeupRow(rowNumber, item);
      dedupeKey = item.sku.toLowerCase();
    }

    if (validationError) {
      errors.push(validationError);
      continue;
    }

    if (seenKeys.has(dedupeKey)) {
      errors.push({
        row: rowNumber,
        sku: productType === 'makeup' ? item.sku : item.name,
        message:
          productType === 'makeup'
            ? 'Duplicate product code in this file'
            : 'Duplicate product name in this file',
      });
      continue;
    }

    seenKeys.add(dedupeKey);
    items.push({ ...item, _sourceRow: rowNumber });
  }

  return { items, errors };
}
