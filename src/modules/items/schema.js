import { Type } from '@sinclair/typebox';

export const ItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  sku: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  category: Type.String(),
  cost_price: Type.String(),
  selling_price: Type.String(),
  current_stock: Type.Integer(),
  min_stock_level: Type.Integer(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
});

export const CreateItemBodySchema = Type.Object({
  sku: Type.String({ minLength: 1, maxLength: 100 }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  category: Type.String({ minLength: 1, maxLength: 100 }),
  min_stock_level: Type.Optional(Type.Integer({ minimum: 0 })),
});

export const UpdateItemBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  category: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  min_stock_level: Type.Optional(Type.Integer({ minimum: 0 })),
});

export const ItemIdParamsSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
});

export const ListItemsQuerySchema = Type.Object({
  category: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  low_stock: Type.Optional(Type.Union([Type.Boolean(), Type.String()])),
});

export const ErrorResponseSchema = Type.Object({
  statusCode: Type.Integer(),
  error: Type.String(),
  message: Type.String(),
});

export const ItemsListResponseSchema = Type.Object({
  data: Type.Array(ItemSchema),
  count: Type.Integer(),
});

export const ItemResponseSchema = Type.Object({
  data: ItemSchema,
});

export const DeleteItemResponseSchema = Type.Object({
  message: Type.String(),
  data: Type.Object({
    id: Type.String({ format: 'uuid' }),
  }),
});

export const BulkImportResponseSchema = Type.Object({
  message: Type.String(),
  data: Type.Object({
    created_count: Type.Integer(),
    failed_count: Type.Integer(),
    created: Type.Array(ItemSchema),
    errors: Type.Array(
      Type.Object({
        row: Type.Integer(),
        sku: Type.String(),
        message: Type.String(),
      })
    ),
  }),
});
