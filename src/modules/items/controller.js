import { AppError } from '../../utils/errors.js';
import * as itemsRepo from './repository.js';
import { batchesRepo } from './repository.js';
import { buildImportTemplateBuffer, parseItemsSpreadsheet } from './import.js';
import { validateCreateItem, validateUpdateItem } from './validation.js';

export async function listItems(request, reply) {
  const { product_type: productType, brand, category, search, low_stock: lowStockParam } = request.query;
  const lowStock = lowStockParam === true || lowStockParam === 'true';

  const items = await itemsRepo.findAll(request.server.db, {
    productType,
    brand,
    category,
    search,
    lowStock,
  });

  return reply.send({ data: items, count: items.length });
}

export async function getItem(request, reply) {
  const item = await itemsRepo.findByIdOrSku(request.server.db, request.params.id);

  if (!item) {
    throw new AppError(404, 'Item not found');
  }

  if (item.product_type === 'skincare') {
    item.batches = await batchesRepo.findByItemId(request.server.db, item.id);
  }

  return reply.send({ data: item });
}

export async function createItem(request, reply) {
  const payload = validateCreateItem(request.body);

  try {
    const item = await itemsRepo.create(request.server.db, payload);
    return reply.status(201).send({ data: item });
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(409, 'A product with this code already exists');
    }
    throw err;
  }
}

export async function updateItem(request, reply) {
  const existing = await itemsRepo.findByIdOrSku(request.server.db, request.params.id);

  if (!existing) {
    throw new AppError(404, 'Item not found');
  }

  const updates = validateUpdateItem(existing, request.body);
  const item = await itemsRepo.update(request.server.db, existing.id, updates);

  if (!item) {
    throw new AppError(404, 'Item not found');
  }

  return reply.send({ data: item });
}

export async function deleteItem(request, reply) {
  const existing = await itemsRepo.findByIdOrSku(request.server.db, request.params.id);

  if (!existing) {
    throw new AppError(404, 'Item not found');
  }

  const hasHistory = await itemsRepo.hasMovements(request.server.db, existing.id);

  if (hasHistory) {
    const deleted = await itemsRepo.softDelete(request.server.db, existing.id);
    if (!deleted) {
      throw new AppError(404, 'Item not found');
    }
    return reply.send({
      message: 'Item soft-deleted because movement history exists',
      data: { id: deleted.id },
    });
  }

  const removed = await itemsRepo.remove(request.server.db, existing.id);
  if (!removed) {
    throw new AppError(404, 'Item not found');
  }

  return reply.send({
    message: 'Item permanently deleted',
    data: { id: removed.id },
  });
}

export async function downloadImportTemplate(request, reply) {
  const productType = request.query.type === 'skincare' ? 'skincare' : 'makeup';
  const buffer = buildImportTemplateBuffer(productType);
  const filename =
    productType === 'skincare'
      ? 'vitapharm-skincare-template.xlsx'
      : 'vitapharm-makeup-template.xlsx';

  return reply
    .header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(buffer);
}

export async function importItems(request, reply) {
  let productType = 'makeup';
  let buffer = null;
  let filename = '';

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      filename = part.filename?.toLowerCase() ?? '';
      buffer = await part.toBuffer();
      continue;
    }

    if (part.fieldname === 'product_type') {
      const value = String(await part.value).trim().toLowerCase();
      productType = value === 'skincare' ? 'skincare' : 'makeup';
    }
  }

  if (!buffer) {
    throw new AppError(400, 'No file uploaded. Choose an Excel file to import.');
  }

  if (!/\.(xlsx|xls|csv)$/.test(filename)) {
    throw new AppError(400, 'Please upload an Excel file (.xlsx, .xls) or CSV.');
  }

  const { items, errors: parseErrors } = parseItemsSpreadsheet(buffer, productType);

  if (items.length === 0 && parseErrors.length === 0) {
    throw new AppError(400, 'No product rows were found in the uploaded file.');
  }

  const { created, errors: insertErrors } = await itemsRepo.createMany(
    request.server.db,
    items
  );
  const errors = [...parseErrors, ...insertErrors];

  const statusCode = created.length > 0 ? 201 : 200;

  return reply.status(statusCode).send({
    data: {
      created_count: created.length,
      failed_count: errors.length,
      created,
      errors,
    },
    message:
      created.length > 0
        ? `${created.length} product${created.length === 1 ? '' : 's'} added successfully`
        : 'No products were added',
  });
}
