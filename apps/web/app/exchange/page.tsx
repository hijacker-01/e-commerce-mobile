'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';

interface ExchangeRequest {
  id: string;
  brand: string;
  model: string;
  condition: string;
  status: string;
  aiValue?: string | null;
  approvedValue?: string | null;
}

export default function ExchangePage() {
  const [items, setItems] = useState<ExchangeRequest[]>([]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('good');
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function load() {
    api.get<ExchangeRequest[]>('/exchange/me').then(setItems).catch(() => {});
  }

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setMsg('Submitting (AI is valuing your device)…');
    try {
      await api.post('/exchange', { brand, model, condition });
      setBrand('');
      setModel('');
      setMsg('Submitted ✓');
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <main style={{ maxWidth: 560 }}>
      <h1>Exchange your old device</h1>
      <div className="card">
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Brand</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Model</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
        </div>
        <label>Condition</label>
        <select value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="like new">Like new</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
        <button
          style={{ marginTop: 12 }}
          onClick={submit}
          disabled={!brand || !model}
        >
          Get exchange value
        </button>
        {msg && (
          <p className="muted" style={{ marginTop: 8 }}>
            {msg}
          </p>
        )}
      </div>

      <h2 style={{ marginTop: 24 }}>Your requests</h2>
      {items.length === 0 && <p className="muted">Nothing submitted yet.</p>}
      {items.map((x) => (
        <div key={x.id} className="card">
          <div className="row">
            <strong style={{ flex: 1 }}>
              {x.brand} {x.model}
            </strong>
            <span className="badge">{x.status}</span>
          </div>
          <div className="muted">Condition: {x.condition}</div>
          {x.aiValue && <div className="muted">AI estimate: ₹{x.aiValue}</div>}
          {x.approvedValue && (
            <div className="price">Approved: ₹{x.approvedValue}</div>
          )}
        </div>
      ))}
    </main>
  );
}
