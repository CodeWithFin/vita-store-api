import {
  CreateItemBodySchema,
  UpdateItemBodySchema,
  ItemIdParamsSchema,
  ListItemsQuerySchema,
  ImportTemplateQuerySchema,
  ItemsListResponseSchema,
  ItemResponseSchema,
  DeleteItemResponseSchema,
  BulkImportResponseSchema,
  ErrorResponseSchema,
} from './schema.js';
import * as controller from './controller.js';

export default async function itemsRoutes(fastify) {
  fastify.get(
    '/import/template',
    {
      schema: {
        tags: ['Items'],
        summary: 'Download Excel import template',
        description: 'Returns a sample spreadsheet for bulk skincare or makeup product uploads.',
        querystring: ImportTemplateQuerySchema,
        response: {
          200: { type: 'string', contentMediaType: 'application/octet-stream' },
          500: ErrorResponseSchema,
        },
      },
    },
    controller.downloadImportTemplate
  );

  fastify.post(
    '/import',
    {
      schema: {
        tags: ['Items'],
        summary: 'Import products from Excel',
        description:
          'Upload an Excel (.xlsx, .xls) or CSV file to add multiple skincare or makeup products at once.',
        consumes: ['multipart/form-data'],
        response: {
          200: BulkImportResponseSchema,
          201: BulkImportResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.importItems
  );

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Items'],
        summary: 'List inventory items',
        description:
          'Fetch all items with optional filters for product type, search text, and low stock status.',
        querystring: ListItemsQuerySchema,
        response: {
          200: ItemsListResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.listItems
  );

  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Items'],
        summary: 'Get item by ID or SKU',
        params: ItemIdParamsSchema,
        response: {
          200: ItemResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.getItem
  );

  fastify.post(
    '/',
    {
      schema: {
        tags: ['Items'],
        summary: 'Create a new inventory item',
        description: 'Creates a skincare or makeup product. Stock can be set on creation.',
        body: CreateItemBodySchema,
        response: {
          201: ItemResponseSchema,
          409: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.createItem
  );

  fastify.put(
    '/:id',
    {
      schema: {
        tags: ['Items'],
        summary: 'Update item details',
        description: 'Updates catalog fields only. Does not modify stock levels.',
        params: ItemIdParamsSchema,
        body: UpdateItemBodySchema,
        response: {
          200: ItemResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.updateItem
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Items'],
        summary: 'Delete an item',
        description:
          'Permanently deletes items without movement history; soft-deletes items with ledger entries.',
        params: ItemIdParamsSchema,
        response: {
          200: DeleteItemResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.deleteItem
  );
}
