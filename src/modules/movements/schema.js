import { Type } from '@sinclair/typebox';
import { ItemSchema } from '../items/schema.js';

export const MovementTypeSchema = Type.Union([
  Type.Literal('IN'),
  Type.Literal('OUT'),
  Type.Literal('ADJUSTMENT'),
]);

export const MovementSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  item_id: Type.String({ format: 'uuid' }),
  batch_id: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  type: MovementTypeSchema,
  quantity: Type.Integer(),
  reason: Type.String(),
  expiry_date: Type.Optional(Type.Union([Type.String({ format: 'date' }), Type.Null()])),
  created_at: Type.String({ format: 'date-time' }),
  item: Type.Optional(
    Type.Object({
      id: Type.String({ format: 'uuid' }),
      sku: Type.Union([Type.String(), Type.Null()]),
      name: Type.String(),
    })
  ),
});

export const CreateMovementBodySchema = Type.Object({
  item_id: Type.String({ format: 'uuid' }),
  type: MovementTypeSchema,
  quantity: Type.Integer(),
  reason: Type.String({ minLength: 1, maxLength: 255 }),
  expiry_date: Type.Optional(Type.String({ format: 'date' })),
});

export const ListMovementsQuerySchema = Type.Object({
  item_id: Type.Optional(Type.String({ format: 'uuid' })),
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});

export const MovementsListResponseSchema = Type.Object({
  data: Type.Array(MovementSchema),
  pagination: Type.Object({
    page: Type.Integer(),
    limit: Type.Integer(),
    total: Type.Integer(),
    total_pages: Type.Integer(),
  }),
});

export const MovementResponseSchema = Type.Object({
  data: Type.Object({
    movement: MovementSchema,
    item: ItemSchema,
  }),
});

export const ErrorResponseSchema = Type.Object({
  statusCode: Type.Integer(),
  error: Type.String(),
  message: Type.String(),
});
