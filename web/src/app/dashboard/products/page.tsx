import { serverFetch } from '@/lib/api-server';
import type { Item } from '@/lib/types';
import ProductsClient from '@/components/ProductsClient';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { brand?: string };
}) {
  const brand = searchParams?.brand;
  const path = brand ? `/api/items?brand=${encodeURIComponent(brand)}` : '/api/items';
  const { data } = await serverFetch<{ data: Item[] }>(path);
  return <ProductsClient initialItems={data} initialBrand={brand || ''} />;
}
