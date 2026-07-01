import { Type } from '@sinclair/typebox';
import * as controller from './controller.js';

const DashboardMetricsSchema = Type.Object({
  total_items: Type.Integer(),
  total_inventory_value: Type.String(),
  low_stock_count: Type.Integer(),
});

const DashboardResponseSchema = Type.Object({
  data: DashboardMetricsSchema,
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
          'Returns aggregated inventory metrics: total value, low stock count, and total item count.',
        response: {
          200: DashboardResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.getMetrics
  );
}
