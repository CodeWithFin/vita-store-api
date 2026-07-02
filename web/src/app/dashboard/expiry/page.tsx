import Link from 'next/link';
import { serverFetch } from '@/lib/api-server';
import type { ExpiringBatch } from '@/lib/types';

export default async function ExpiryPage() {
  const { data } = await serverFetch<{ data: ExpiringBatch[]; count: number }>(
    '/api/dashboard/expiring?days=90'
  );

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">
          Expiry <span className="serif">alerts.</span>
        </h1>
        <p className="page-sub">
          {data.length} batch{data.length === 1 ? '' : 'es'} expiring within 90 days
        </p>
      </header>

      <div className="table-card clip-card">
        {data.length === 0 ? (
          <p className="empty-text" style={{ padding: 20 }}>
            No batches expiring soon.
          </p>
        ) : (
          <table className="data-table is-cards">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Expiry</th>
                <th>Days left</th>
                <th>Pieces</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.batch_id}>
                  <td data-label="Product">{entry.product_name}</td>
                  <td data-label="Brand">{entry.brand}</td>
                  <td data-label="Expiry">{new Date(entry.expiry_date).toLocaleDateString()}</td>
                  <td data-label="Days left">{entry.days_until_expiry}</td>
                  <td data-label="Pieces">{entry.quantity}</td>
                  <td data-label="Status">{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link href="/dashboard/products" className="btn btn-outline" style={{ marginTop: 16 }}>
        View products
      </Link>
    </div>
  );
}
