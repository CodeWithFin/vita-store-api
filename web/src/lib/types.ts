export type ProductType = 'skincare' | 'makeup';

export interface Item {
  id: string;
  sku: string | null;
  name: string;
  brand: string;
  description: string | null;
  category: string;
  product_type: ProductType;
  amount: string | null;
  amount_unit: string | null;
  current_stock: number;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
  batches?: Batch[];
}

export interface Batch {
  id: string;
  item_id: string;
  expiry_date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  item_id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  expiry_date: string | null;
  created_at: string;
  item?: { id: string; sku: string | null; name: string };
}

export interface Metrics {
  total_items: number;
  total_inventory_value: string;
  low_stock_count: number;
  expiring_batch_count: number;
}

export interface ExpiringBatch {
  batch_id: string;
  item_id: string;
  product_name: string;
  brand: string;
  product_type: ProductType;
  expiry_date: string;
  quantity: number;
  days_until_expiry: number;
  status: 'expired' | 'critical' | 'warning';
}

export interface BrandSummary {
  brand: string;
  product_count: number;
  skincare_count: number;
  makeup_count: number;
  total_pieces: number;
}

export interface User {
  username: string;
}
