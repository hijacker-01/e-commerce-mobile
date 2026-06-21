'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface Product {
  id: string;
  title: string;
}
interface LobbyItem {
  id: string;
  product: Product;
}
interface ServiceCenter {
  id: string;
  brand: string;
  name: string;
  address?: string;
  phone?: string;
}

export default function StorefrontPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lobby, setLobby] = useState<LobbyItem[]>([]);
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [pick, setPick] = useState('');
  const [sc, setSc] = useState({ brand: '', name: '', address: '', phone: '' });
  const router = useRouter();

  function load() {
    api.get<Product[]>('/products').then(setProducts).catch(() => {});
    api.get<LobbyItem[]>('/lobby').then(setLobby).catch(() => {});
    api.get<ServiceCenter[]>('/service-centers').then(setCenters).catch(() => {});
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

  async function addLobby() {
    if (!pick) return;
    try {
      await api.post('/lobby', { productId: pick });
      setPick('');
      toast('Featured on storefront ✓');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  async function removeLobby(productId: string) {
    await api.del(`/lobby/${productId}`);
    toast('Removed from lobby', 'info');
    load();
  }
  async function addCenter() {
    try {
      await api.post('/service-centers', sc);
      setSc({ brand: '', name: '', address: '', phone: '' });
      toast('Service center added ✓');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }
  async function removeCenter(id: string) {
    await api.del(`/service-centers/${id}`);
    toast('Service center removed', 'info');
    load();
  }

  return (
    <main>
      <h1>Storefront</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Special lobby (owner&apos;s picks)</h2>
        <div className="row">
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button onClick={addLobby} disabled={!pick}>
            Feature
          </button>
        </div>
        <table style={{ marginTop: 12 }}>
          <tbody>
            {lobby.map((l) => (
              <tr key={l.id}>
                <td>{l.product.title}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="secondary"
                    onClick={() => removeLobby(l.product.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lobby.length === 0 && <p className="muted">No featured products.</p>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Service centers</h2>
        <div className="row">
          <input
            placeholder="Brand"
            value={sc.brand}
            onChange={(e) => setSc({ ...sc, brand: e.target.value })}
          />
          <input
            placeholder="Name"
            value={sc.name}
            onChange={(e) => setSc({ ...sc, name: e.target.value })}
          />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input
            placeholder="Address"
            value={sc.address}
            onChange={(e) => setSc({ ...sc, address: e.target.value })}
          />
          <input
            placeholder="Phone"
            value={sc.phone}
            onChange={(e) => setSc({ ...sc, phone: e.target.value })}
          />
          <button onClick={addCenter} disabled={!sc.brand || !sc.name}>
            Add
          </button>
        </div>
        <table style={{ marginTop: 12 }}>
          <tbody>
            {centers.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="badge">{c.brand}</span> {c.name}
                </td>
                <td className="muted">{c.address}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="secondary" onClick={() => removeCenter(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {centers.length === 0 && <p className="muted">No service centers.</p>}
      </div>
    </main>
  );
}
