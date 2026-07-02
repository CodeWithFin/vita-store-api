import Link from 'next/link';
import { serverFetch } from '@/lib/api-server';
import type { BrandSummary } from '@/lib/types';

export default async function BrandsPage() {
  const { data } = await serverFetch<{ data: BrandSummary[]; count: number }>('/api/dashboard/brands');

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">
          Available <span className="serif">brands.</span>
        </h1>
        <p className="page-sub">
          {data.length} brand{data.length === 1 ? '' : 's'} in catalog
        </p>
      </header>

      <section className="brands-grid">
        {data.map((brand) => (
          <article key={brand.brand} className="brand-card clip-card">
            <h2>{brand.brand}</h2>
            <p>
              {brand.product_count} products
              <br />
              {brand.skincare_count} skincare · {brand.makeup_count} makeup
              <br />
              {brand.total_pieces} pieces in stock
            </p>
            <Link
              href={`/dashboard/products?brand=${encodeURIComponent(brand.brand)}`}
              className="btn btn-outline"
              style={{ width: '100%' }}
            >
              View products
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
