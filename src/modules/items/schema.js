import { Type } from '@sinclair/typebox';

export const ProductTypeSchema = Type.Union([
  Type.Literal('skincare'),
  Type.Literal('makeup'),
]);

export const BatchSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  item_id: Type.String({ format: 'uuid' }),
  expiry_date: Type.String({ format: 'date' }),
  quantity: Type.Integer(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
});

export const ItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  sku: Type.Union([Type.String(), Type.Null()]),
  name: Type.String(),
  brand: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  category: Type.String(),
  product_type: ProductTypeSchema,
  amount: Type.Union([Type.String(), Type.Null()]),
  amount_unit: Type.Union([Type.String(), Type.Null()]),
  cost_price: Type.String(),
  selling_price: Type.String(),
  current_stock: Type.Integer(),
  min_stock_level: Type.Integer(),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' }),
  batches: Type.Optional(Type.Array(BatchSchema)),
});

export const CreateItemBodySchema = Type.Object({
  product_type: ProductTypeSchema,
  sku: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  brand: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  amount: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  amount_unit: Type.Optional(Type.Union([Type.Literal('ml'), Type.Literal('g')])),
  initial_stock: Type.Optional(Type.Integer({ minimum: 0 })),
  expiry_date: Type.Optional(Type.String({ format: 'date' })),
  min_stock_level: Type.Optional(Type.Integer({ minimum: 0 })),
});

export const UpdateItemBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  brand: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  amount: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  amount_unit: Type.Optional(Type.Union([Type.Literal('ml'), Type.Literal('g')])),
  min_stock_level: Type.Optional(Type.Integer({ minimum: 0 })),
});

export const ItemIdParamsSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
});

export const ListItemsQuerySchema = Type.Object({
  product_type: Type.Optional(ProductTypeSchema),
  brand: Type.Optional(Type.String()),
  category: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  low_stock: Type.Optional(Type.Union([Type.Boolean(), Type.String()])),
});

export const ImportTemplateQuerySchema = Type.Object({
  type: Type.Optional(ProductTypeSchema),
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
