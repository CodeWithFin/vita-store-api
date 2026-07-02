import Link from 'next/link';
import { serverFetch } from '@/lib/api-server';
import type { ExpiringBatch, Item, Metrics, Movement } from '@/lib/types';

async function getOverviewData() {
  const [metrics, items, expiring, movements, brands] = await Promise.all([
    serverFetch<{ data: Metrics }>('/api/dashboard/metrics'),
    serverFetch<{ data: Item[] }>('/api/items'),
    serverFetch<{ data: ExpiringBatch[] }>('/api/dashboard/expiring?days=90'),
    serverFetch<{ data: Movement[] }>('/api/movements?limit=5'),
    serverFetch<{ data: { brand: string }[]; count: number }>('/api/dashboard/brands'),
  ]);

  return {
    metrics: metrics.data,
    items: items.data,
    expiring: expiring.data,
    movements: movements.data,
    brandCount: brands.count,
  };
}

export default async function DashboardPage() {
  const { metrics, items, expiring, movements, brandCount } = await getOverviewData();
  const lowStock = items.filter((i) => i.current_stock <= i.min_stock_level);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">
          Dashboard <span className="serif">today.</span>
        </h1>
        <p className="page-sub">Server-rendered overview for fast first paint.</p>
      </header>

      <section className="kpi-grid">
        {[
          { label: 'Low stock', value: metrics.low_stock_count, href: '/dashboard/products' },
          { label: 'Total items', value: metrics.total_items, href: '/dashboard/products' },
          { label: 'Expiring soon', value: metrics.expiring_batch_count, href: '/dashboard/expiry' },
          { label: 'Brands', value: brandCount, href: '/dashboard/brands' },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="kpi-card clip-card">
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-value">{card.value}</div>
          </Link>
        ))}
      </section>

      <section className="split-grid">
        <div className="panel-card clip-card">
          <h2>Low stock</h2>
          {lowStock.length === 0 ? (
            <p className="empty-text">No low-stock items.</p>
          ) : (
            <ul className="list-plain">
              {lowStock.slice(0, 5).map((item) => (
                <li key={item.id} className="list-row">
                  <span>{item.name}</span>
                  <strong>{item.current_stock} pcs</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel-card clip-card">
          <h2>Expiry alerts</h2>
          {expiring.length === 0 ? (
            <p className="empty-text">No batches expiring within 90 days.</p>
          ) : (
            <ul className="list-plain">
              {expiring.slice(0, 5).map((entry) => (
                <li key={entry.batch_id} className="list-row">
                  <span>
                    {entry.product_name} · {entry.brand}
                  </span>
                  <strong>{entry.days_until_expiry}d</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="panel-card clip-card">
        <h2>Recent movements</h2>
        {movements.length === 0 ? (
          <p className="empty-text">No movements yet.</p>
        ) : (
          <table className="data-table is-cards">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Item">{m.item?.name || m.item_id}</td>
                    <td data-label="Type">{m.type}</td>
                    <td data-label="Qty">{m.quantity}</td>
                  </tr>
                ))}
              </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
