import { Type } from '@sinclair/typebox';
import * as controller from './controller.js';

const DashboardMetricsSchema = Type.Object({
  total_items: Type.Integer(),
  total_inventory_value: Type.String(),
  low_stock_count: Type.Integer(),
  expiring_batch_count: Type.Integer(),
});

const DashboardResponseSchema = Type.Object({
  data: DashboardMetricsSchema,
});

const ExpiringBatchSchema = Type.Object({
  batch_id: Type.String({ format: 'uuid' }),
  item_id: Type.String({ format: 'uuid' }),
  product_name: Type.String(),
  brand: Type.String(),
  product_type: Type.Union([Type.Literal('skincare'), Type.Literal('makeup')]),
  expiry_date: Type.String({ format: 'date' }),
  quantity: Type.Integer(),
  days_until_expiry: Type.Integer(),
  status: Type.Union([
    Type.Literal('expired'),
    Type.Literal('critical'),
    Type.Literal('warning'),
  ]),
});

const ExpiringResponseSchema = Type.Object({
  data: Type.Array(ExpiringBatchSchema),
  count: Type.Integer(),
});

const BrandSchema = Type.Object({
  brand: Type.String(),
  product_count: Type.Integer(),
  skincare_count: Type.Integer(),
  makeup_count: Type.Integer(),
  total_pieces: Type.Integer(),
});

const BrandsResponseSchema = Type.Object({
  data: Type.Array(BrandSchema),
  count: Type.Integer(),
});

const ExpiringQuerySchema = Type.Object({
  days: Type.Optional(Type.Integer({ minimum: 1, maximum: 365, default: 90 })),
});

const ErrorResponseSchema = Type.Object({
  statusCode: Type.Integer(),
  error: Type.String(),
  message: Type.String(),
});

export default async function dashboardRoutes(fastify) {
  fastify.get(
    '/metrics',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'Get dashboard metrics',
        description:
          'Returns aggregated inventory metrics including low stock and expiring batch counts.',
        response: {
          200: DashboardResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.getMetrics
  );

  fastify.get(
    '/expiring',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'List batches nearing expiry',
        description:
          'Returns skincare batches with stock that expire within the given number of days (default 90).',
        querystring: ExpiringQuerySchema,
        response: {
          200: ExpiringResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.getExpiring
  );

  fastify.get(
    '/brands',
    {
      schema: {
        tags: ['Dashboard'],
        summary: 'List available brands',
        description: 'Returns brands currently in the product catalog with product counts.',
        response: {
          200: BrandsResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.getBrands
  );
}
