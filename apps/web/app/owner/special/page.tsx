'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface Product {
  id: string;
  title: string;
  price: string;
}
interface SpecialOffer {
  id: string;
  productId: string;
  title: string;
  specialPrice: string;
  originalPrice: string;
  lowestPrice: string;
}

export default function OwnerSpecialPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [pick, setPick] = useState('');
  const [price, setPrice] = useState('');
  const router = useRouter();

  function load() {
    api.get<Product[]>('/products').then(setProducts).catch(() => {});
    api.get<SpecialOffer[]>('/special').then(setOffers).catch(() => {});
  }

  useEffect(() => {
    const role = getRole();
    if (!getToken() || (role !== 'OWNER' && role !== 'EMPLOYEE')) {
      router.push('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSpecial = new Set(offers.map((o) => o.productId));
  const chosen = products.find((p) => p.id === pick);

  async function add() {
    if (!pick || !price) return;
    try {
      await api.post('/special', {
        productId: pick,
        specialPrice: Number(price),
      });
      toast('Added to the Special Store ✓');
      setPick('');
      setPrice('');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(productId: string) {
    try {
      await api.del(`/special/${productId}`);
      toast('Removed — price restored', 'info');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <main>
      <Link href="/owner" className="muted">
        ← Back to dashboard
      </Link>
      <div className="eyebrow" style={{ marginTop: 8 }}>
        Merchandising
      </div>
      <h1>Special Store</h1>
      <p className="muted">
        Shift a product here at a special price — it becomes the item’s effective
        price everywhere, and the public{' '}
        <Link href="/special">Special Store</Link> shows it with its yearly
        lowest price.
      </p>

      <div className="card" style={{ marginTop: 8 }}>
        <strong>Add a deal</strong>
        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label>Product</label>
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {onSpecial.has(p.id) ? '(already on special)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label>Special price (₹)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {chosen && (
              <p className="field-hint">
                Current price ₹{Number(chosen.price).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
        <button style={{ marginTop: 14 }} onClick={add} disabled={!pick || !price}>
          {onSpecial.has(pick) ? 'Update special price' : 'Add to Special Store'}
        </button>
      </div>

      <h2 style={{ marginTop: 28 }}>On special ({offers.length})</h2>
      {offers.length === 0 ? (
        <p className="muted">No products in the Special Store yet.</p>
      ) : (
        <div className="card" style={{ padding: 8 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Special</th>
                <th>Original</th>
                <th>Yearly lowest</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>{o.title}</td>
                  <td>
                    <strong>
                      ₹{Number(o.specialPrice).toLocaleString('en-IN')}
                    </strong>
                  </td>
                  <td className="mrp">
                    ₹{Number(o.originalPrice).toLocaleString('en-IN')}
                  </td>
                  <td className="stock-in">
                    ₹{Number(o.lowestPrice).toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="secondary"
                      onClick={() => remove(o.productId)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
