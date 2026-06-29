'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import {
  PHONES,
  EXCHANGE_QUESTIONS,
  deriveCondition,
} from '../../lib/phones';

interface ExchangeRequest {
  id: string;
  brand: string;
  model: string;
  condition: string;
  imei?: string | null;
  details?: string | null;
  status: string;
  aiValue?: string | null;
  approvedValue?: string | null;
}

export default function ExchangePage() {
  const [items, setItems] = useState<ExchangeRequest[]>([]);
  const [imei, setImei] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
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

  const models = useMemo(
    () => PHONES.find((b) => b.brand === brand)?.models ?? [],
    [brand],
  );
  const variants = useMemo(
    () => models.find((m) => m.name === model)?.variants ?? [],
    [models, model],
  );

  const imeiValid = /^\d{15}$/.test(imei);
  const allAnswered = EXCHANGE_QUESTIONS.every((q) => answers[q.key]);
  const canSubmit = imeiValid && brand && model && variant && allAnswered;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setMsg('Valuing your device with AI…');
    try {
      const condition = deriveCondition(answers);
      const details =
        `Variant: ${variant}. ` +
        EXCHANGE_QUESTIONS.map((q) => {
          const opt = q.options.find((o) => o.value === answers[q.key]);
          return `${q.label.replace(/^\d+\.\s*/, '')} → ${opt?.label}`;
        }).join('; ');
      await api.post('/exchange', {
        brand,
        model: `${model} (${variant})`,
        condition,
        imei,
        details,
        answers,
      });
      setMsg('Submitted ✓ — see the AI estimate below.');
      setImei('');
      setBrand('');
      setModel('');
      setVariant('');
      setAnswers({});
      load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 620 }}>
      <h1>Exchange your old device</h1>
      <div className="pickup-best" style={{ marginBottom: 16 }}>
        📄 <strong>Required for exchange:</strong> bring the original{' '}
        <strong>purchase bill / invoice</strong> and your{' '}
        <strong>Aadhaar card</strong> to the store — the exchange can’t be
        completed without both.
      </div>

      <div className="card">
        {/* IMEI */}
        <label>IMEI number (dial *#06# to find it)</label>
        <input
          inputMode="numeric"
          maxLength={15}
          placeholder="15-digit IMEI"
          value={imei}
          onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
        />
        {imei.length > 0 && !imeiValid && (
          <p className="field-hint" style={{ color: 'var(--danger)' }}>
            IMEI must be exactly 15 digits ({imei.length}/15).
          </p>
        )}

        {/* Smart phone picker */}
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Brand</label>
            <select
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setModel('');
                setVariant('');
              }}
            >
              <option value="">Select brand…</option>
              {PHONES.map((b) => (
                <option key={b.brand} value={b.brand}>
                  {b.brand}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Model</label>
            <select
              value={model}
              disabled={!brand}
              onChange={(e) => {
                setModel(e.target.value);
                setVariant('');
              }}
            >
              <option value="">Select model…</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Variant</label>
            <select
              value={variant}
              disabled={!model}
              onChange={(e) => setVariant(e.target.value)}
            >
              <option value="">Select variant…</option>
              {variants.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Condition questions */}
        <div className="divider" />
        <strong style={{ fontSize: 14 }}>Tell us its condition</strong>
        {EXCHANGE_QUESTIONS.map((q) => (
          <div key={q.key} style={{ marginTop: 10 }}>
            <label>{q.label}</label>
            <select
              value={answers[q.key] ?? ''}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q.key]: e.target.value }))
              }
            >
              <option value="">Select…</option>
              {q.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        <button
          style={{ marginTop: 16 }}
          onClick={submit}
          disabled={!canSubmit || busy}
        >
          {busy ? 'Valuing…' : 'Get exchange value'}
        </button>
        {!canSubmit && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Enter a valid IMEI, pick your phone &amp; variant, and answer all
            questions to get a quote.
          </p>
        )}
        {msg && (
          <p className="muted" style={{ marginTop: 8 }}>
            {msg}
          </p>
        )}
      </div>

      <h2 style={{ marginTop: 24 }}>Your requests</h2>
      {items.length === 0 && <p className="muted">Nothing submitted yet.</p>}
      {items.map((x) => (
        <div key={x.id} className="card" style={{ marginBottom: 10 }}>
          <div className="row">
            <strong style={{ flex: 1 }}>
              {x.brand} {x.model}
            </strong>
            <span className="badge">{x.status}</span>
          </div>
          <div className="muted">Condition: {x.condition}</div>
          {x.imei && <div className="muted">IMEI: {x.imei}</div>}
          {x.aiValue && (
            <div className="price">
              Buyback estimate: ₹
              {Number(x.aiValue).toLocaleString('en-IN')}
            </div>
          )}
          {x.details && (
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {x.details}
            </div>
          )}
          {x.approvedValue && (
            <div className="price">
              Approved: ₹{Number(x.approvedValue).toLocaleString('en-IN')}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
