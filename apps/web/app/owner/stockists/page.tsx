'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface Stockist {
  id: string;
  name: string;
  gstin?: string;
}
interface Product {
  id: string;
  title: string;
}
interface Challan {
  id: string;
  number: string;
  status: string;
  totalAmount: string;
  stockist?: { name: string } | null;
}
interface Line {
  productId: string;
  name: string;
  quantity: number;
  rate: number;
}

export default function OwnerStockistsPage() {
  const [stockists, setStockists] = useState<Stockist[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [stockistId, setStockistId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const router = useRouter();

  function load() {
    api.get<Stockist[]>('/stockists').then(setStockists).catch(() => {});
    api.get<Product[]>('/products').then(setProducts).catch(() => {});
    api.get<Challan[]>('/stockists/challans').then(setChallans).catch(() => {});
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

  async function addStockist() {
    try {
      await api.post('/stockists', { name, gstin: gstin || undefined });
      setName('');
      setGstin('');
      toast('Stockist added');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  function addLine() {
    const p = products[0];
    if (!p) return;
    setLines((l) => [
      ...l,
      { productId: p.id, name: p.title, quantity: 1, rate: 0 },
    ]);
  }
  function setLine(i: number, patch: Partial<Line>) {
    setLines((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function createChallan() {
    try {
      await api.post('/stockists/challans', { stockistId, items: lines });
      setLines([]);
      toast('Challan issued ✓');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function receive(id: string) {
    try {
      await api.post(`/stockists/challans/${id}/receive`);
      toast('Stock received → inventory updated ✓');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <main>
      <h1>Stockists &amp; challans</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Register stockist</h2>
        <div className="row">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          <button onClick={addStockist} disabled={!name}>
            Add
          </button>
        </div>
        <table style={{ marginTop: 12 }}>
          <tbody>
            {stockists.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="muted">{s.gstin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>New inbound challan</h2>
        <label>Stockist</label>
        <select value={stockistId} onChange={(e) => setStockistId(e.target.value)}>
          <option value="">Select…</option>
          {stockists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {lines.map((ln, i) => (
          <div className="row" key={i} style={{ marginTop: 8 }}>
            <select
              value={ln.productId}
              onChange={(e) => {
                const p = products.find((x) => x.id === e.target.value);
                setLine(i, { productId: e.target.value, name: p?.title ?? '' });
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="number"
              style={{ width: 90 }}
              value={ln.quantity}
              onChange={(e) => setLine(i, { quantity: Number(e.target.value) })}
            />
            <input
              type="number"
              style={{ width: 110 }}
              placeholder="rate"
              value={ln.rate}
              onChange={(e) => setLine(i, { rate: Number(e.target.value) })}
            />
          </div>
        ))}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="secondary" onClick={addLine}>
            + Add line
          </button>
          <button onClick={createChallan} disabled={!stockistId || lines.length === 0}>
            Issue challan
          </button>
        </div>
      </div>

      <h2>Challans</h2>
      <table>
        <thead>
          <tr>
            <th>Number</th>
            <th>Stockist</th>
            <th>Status</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {challans.map((c) => (
            <tr key={c.id}>
              <td>{c.number}</td>
              <td>{c.stockist?.name}</td>
              <td>
                <span className="badge">{c.status}</span>
              </td>
              <td>₹{c.totalAmount}</td>
              <td>
                {c.status !== 'RECEIVED' && (
                  <button className="success" onClick={() => receive(c.id)}>
                    Receive
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
