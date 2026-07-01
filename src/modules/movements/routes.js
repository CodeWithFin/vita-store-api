import {
  CreateMovementBodySchema,
  ListMovementsQuerySchema,
  MovementsListResponseSchema,
  MovementResponseSchema,
  ErrorResponseSchema,
} from './schema.js';
import * as controller from './controller.js';

export default async function movementsRoutes(fastify) {
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Movements'],
        summary: 'Log a stock movement',
        description:
          'Records a ledger entry and updates item stock within a single database transaction.',
        body: CreateMovementBodySchema,
        response: {
          201: MovementResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.createMovement
  );

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Movements'],
        summary: 'List stock movements',
        description: 'Returns the chronological movement ledger with pagination and optional item filter.',
        querystring: ListMovementsQuerySchema,
        response: {
          200: MovementsListResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    controller.listMovements
  );
}
