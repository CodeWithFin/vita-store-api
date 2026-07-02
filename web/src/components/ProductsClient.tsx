'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api';
import type { Item } from '@/lib/types';

function formatCodeOrSize(item: Item) {
  if (item.product_type === 'skincare') {
    return item.amount ? `${item.amount}${item.amount_unit || ''}` : '—';
  }
  return item.sku || '—';
}

export default function ProductsClient({
  initialItems,
  initialBrand = '',
}: {
  initialItems: Item[];
  initialBrand?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('');
  const [brand, setBrand] = useState(initialBrand);
  const [toast, setToast] = useState('');

  async function reload() {
    const { data } = await clientApi.getItems({
      search: search || undefined,
      product_type: productType || undefined,
      brand: brand || undefined,
    });
    setItems(data);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      reload().catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, productType, brand]);

  async function onDelete(item: Item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await clientApi.deleteItem(item.id);
      setToast('Product removed');
      await reload();
      router.refresh();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">
          All <span className="serif">products.</span>
        </h1>
      </header>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="select" value={productType} onChange={(e) => setProductType(e.target.value)}>
          <option value="">All types</option>
          <option value="skincare">Skincare</option>
          <option value="makeup">Makeup</option>
        </select>
        <input
          className="input"
          placeholder="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
      </div>

      {items.length === 0 ? (
        <p className="empty-text">No products match your filters.</p>
      ) : (
        <div className="table-card clip-card">
          <table className="data-table is-cards">
          <thead>
            <tr>
              <th>Type</th>
              <th>Brand</th>
              <th>Code / Size</th>
              <th>Name</th>
              <th>Pieces</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="Type">{item.product_type}</td>
                <td data-label="Brand">{item.brand}</td>
                <td data-label="Code / Size">{formatCodeOrSize(item)}</td>
                <td data-label="Name">{item.name}</td>
                <td data-label="Pieces">{item.current_stock}</td>
                <td data-label="Actions">
                  <button className="btn btn-outline" type="button" onClick={() => onDelete(item)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {toast ? <div className={`toast ${toast.includes('failed') ? 'error' : ''}`}>{toast}</div> : null}
    </div>
  );
}
