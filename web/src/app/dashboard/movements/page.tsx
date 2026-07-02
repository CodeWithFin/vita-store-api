import { serverFetch } from '@/lib/api-server';
import type { Movement } from '@/lib/types';

export default async function MovementsPage() {
  const { data, pagination } = await serverFetch<{
    data: Movement[];
    pagination: { total: number };
  }>('/api/movements?limit=50');

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">
          Movement <span className="serif">ledger.</span>
        </h1>
        <p className="page-sub">{pagination.total} total entries</p>
      </header>

      <div className="table-card clip-card">
        {data.length === 0 ? (
          <p className="empty-text" style={{ padding: 20 }}>
            No movements yet.
          </p>
        ) : (
          <table className="data-table is-cards">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Expiry</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id}>
                  <td data-label="Date">{new Date(m.created_at).toLocaleString()}</td>
                  <td data-label="Item">{m.item?.name || m.item_id}</td>
                  <td data-label="Type">{m.type}</td>
                  <td data-label="Qty">{m.quantity}</td>
                  <td data-label="Expiry">{m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : '—'}</td>
                  <td data-label="Reason">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
