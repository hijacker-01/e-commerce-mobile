'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getRole, getToken } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface Question {
  id: string;
  question: string;
  answer?: string | null;
  createdAt: string;
  user?: { name: string } | null;
  product?: { id: string; title: string } | null;
}

export default function OwnerQuestionsPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [onlyPending, setOnlyPending] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const router = useRouter();

  function load(pending = onlyPending) {
    api
      .get<Question[]>(`/products/meta/questions?unanswered=${pending}`)
      .then(setItems)
      .catch(() => {});
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

  async function answer(id: string) {
    const text = (drafts[id] || '').trim();
    if (!text) return;
    try {
      await api.patch(`/products/questions/${id}/answer`, { answer: text });
      toast('Answer posted ✓');
      setDrafts((d) => ({ ...d, [id]: '' }));
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const pendingCount = items.filter((q) => !q.answer).length;

  return (
    <main>
      <Link href="/owner" className="muted">
        ← Back to dashboard
      </Link>
      <div className="section-head" style={{ marginTop: 8 }}>
        <h1 style={{ margin: 0 }}>
          Customer Q&amp;A
          {onlyPending && pendingCount > 0 && (
            <span className="nav-count" style={{ marginLeft: 8 }}>
              {pendingCount}
            </span>
          )}
        </h1>
        <button
          className="secondary"
          onClick={() => {
            const next = !onlyPending;
            setOnlyPending(next);
            load(next);
          }}
        >
          {onlyPending ? 'Show all' : 'Show pending only'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">💬</div>
          <h3 style={{ marginTop: 12 }}>
            {onlyPending ? 'No pending questions' : 'No questions yet'}
          </h3>
          <p className="muted">Customer questions will appear here to answer.</p>
        </div>
      ) : (
        items.map((q) => (
          <div key={q.id} className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              {q.product && (
                <Link
                  href={`/product/${q.product.id}`}
                  className="muted"
                  style={{ fontSize: 13 }}
                >
                  {q.product.title}
                </Link>
              )}
              <span className="muted" style={{ fontSize: 12 }}>
                {q.user?.name ?? 'Customer'} ·{' '}
                {new Date(q.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="qa-tag qa-q">Q</span>
              <strong>{q.question}</strong>
            </div>
            {q.answer ? (
              <div style={{ marginTop: 8 }}>
                <span className="qa-tag qa-a">A</span>
                {q.answer}
              </div>
            ) : (
              <div className="row" style={{ marginTop: 10 }}>
                <input
                  placeholder="Type your answer…"
                  value={drafts[q.id] || ''}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && answer(q.id)}
                />
                <button onClick={() => answer(q.id)} disabled={!drafts[q.id]?.trim()}>
                  Answer
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </main>
  );
}
