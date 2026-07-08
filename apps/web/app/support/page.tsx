'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';

interface Msg {
  role: 'you' | 'ai';
  text: string;
}

export default function SupportPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.push('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    if (!q.trim()) return;
    const question = q;
    setMessages((m) => [...m, { role: 'you', text: question }]);
    setQ('');
    setBusy(true);
    try {
      const r = await api.post<{ answer: string }>('/ai/support', { question });
      setMessages((m) => [...m, { role: 'ai', text: r.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: 'Support is temporarily unreachable. Please try again in a moment, or call the store at 8959863333.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 640 }}>
      <h1>AI support</h1>
      <div className="card" style={{ minHeight: 240 }}>
        {messages.length === 0 && (
          <p className="muted">
            Ask about your orders, delivery, or which accessory fits your device.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`bubble ${m.role === 'you' ? 'bubble-me' : 'bubble-them'}`}
          >
            {m.text}
          </div>
        ))}
        {busy && <p className="muted">…thinking</p>}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type your question…"
        />
        <button onClick={send} disabled={busy}>
          Send
        </button>
      </div>
    </main>
  );
}
