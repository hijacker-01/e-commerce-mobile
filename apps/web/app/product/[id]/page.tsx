'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken, getRole } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { recordRecent } from '../../../lib/recentlyViewed';

interface Product {
  id: string;
  brand: string;
  model: string;
  title: string;
  description?: string;
  price: string;
  mrp?: string | null;
  lowestPrice?: string | null;
  media?: string[];
  specs: Record<string, unknown>;
  videoLinks: string[];
  categoryId?: string;
  category?: { id: string; name: string } | null;
  variantLabel?: string | null;
  variants?: Variant[];
  inStock?: boolean;
  shop?: {
    name: string;
    address?: string | null;
    hours?: string | null;
    phone?: string | null;
  } | null;
}
interface Variant {
  id: string;
  variantLabel: string | null;
  price: string;
  inStock?: boolean;
}
interface Question {
  id: string;
  question: string;
  answer?: string | null;
  createdAt: string;
  user?: { name: string } | null;
}
interface Review {
  id: string;
  rating: number;
  text?: string;
  verified: boolean;
  user?: { name: string };
}
interface ReviewSummary {
  summary: string;
  pros: string[];
  cons: string[];
  sentiment: string;
}
interface SimpleProduct {
  id: string;
  title: string;
  brand: string;
  model: string;
  price: string;
  mrp?: string | null;
  media?: string[];
}
interface Coupon {
  id: string;
  code: string;
  type: string;
  value: string;
  minOrder?: string;
}

export default function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [selImg, setSelImg] = useState(0);
  const [similar, setSimilar] = useState<SimpleProduct[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [posting, setPosting] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const role = getRole();
  const isCustomer = role === 'CUSTOMER';
  const isStaff = role === 'OWNER' || role === 'EMPLOYEE';

  function loadReviews() {
    api.get<Review[]>(`/reviews/product/${id}`).then(setReviews).catch(() => {});
  }
  function loadQuestions() {
    api
      .get<Question[]>(`/products/${id}/questions`)
      .then(setQuestions)
      .catch(() => {});
  }

  useEffect(() => {
    api
      .get<Product>(`/products/${id}`)
      .then((p) => {
        setProduct(p);
        recordRecent({
          id: p.id,
          title: p.title,
          price: p.price,
          mrp: p.mrp,
          image: p.media?.[0],
        });
        // "You may also like" — same category, excluding this product.
        const catId = p.category?.id ?? p.categoryId;
        if (catId) {
          api
            .get<SimpleProduct[]>(`/products?categoryId=${catId}`)
            .then((list) =>
              setSimilar(list.filter((x) => x.id !== p.id).slice(0, 4)),
            )
            .catch(() => {});
        }
      })
      .catch(() => {});
    api.get<Coupon[]>('/coupons').then(setCoupons).catch(() => {});
    loadReviews();
    loadQuestions();
    if (getToken() && isCustomer) {
      api
        .get<{ product: { id: string } }[]>('/wishlist')
        .then((items) => setSaved(items.some((w) => w.product.id === id)))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitReview() {
    if (!getToken()) {
      toast('Please log in to write a review.', 'info');
      return router.push('/login');
    }
    if (!rating) return toast('Please pick a star rating.', 'info');
    setPosting(true);
    try {
      await api.post('/reviews', { productId: id, rating, text: reviewText });
      toast('Thanks for your review!');
      setRating(0);
      setReviewText('');
      loadReviews();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setPosting(false);
    }
  }

  async function addToCart() {
    if (!getToken()) {
      toast('Please log in first.', 'info');
      return router.push('/login');
    }
    try {
      await api.post('/cart/items', { productId: id, quantity: 1 });
      toast('Added to cart');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function askQuestion() {
    if (!getToken()) {
      toast('Please log in to ask a question.', 'info');
      return router.push('/login');
    }
    if (!newQuestion.trim()) return;
    try {
      await api.post(`/products/${id}/questions`, { question: newQuestion });
      toast('Question submitted — the store will answer soon.');
      setNewQuestion('');
      loadQuestions();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function saveToWishlist() {
    if (!getToken()) {
      toast('Please log in first.', 'info');
      return router.push('/login');
    }
    const wasSaved = saved;
    setSaved(!wasSaved); // optimistic
    try {
      if (wasSaved) {
        await api.del(`/wishlist/${id}`);
        toast('Removed from wishlist', 'info');
      } else {
        await api.post(`/wishlist/${id}`);
        toast('Saved to wishlist ♥');
      }
    } catch (e) {
      setSaved(wasSaved); // rollback
      toast((e as Error).message, 'error');
    }
  }

  async function bargain() {
    if (!getToken()) {
      toast('Please log in first.', 'info');
      return router.push('/login');
    }
    try {
      const t = await api.post<{ id: string }>('/chat/threads', {
        productId: id,
      });
      router.push(`/chat?thread=${t.id}`);
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  async function loadSummary() {
    setNote('Generating AI review summary…');
    try {
      const s = await api.get<ReviewSummary | null>(
        `/reviews/product/${id}/summary`,
      );
      setSummary(s);
      setNote(s ? null : 'No reviews to summarize yet.');
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  if (!product) return <p className="muted">Loading…</p>;

  const inStock = !!product.inStock;
  const mrpNum = product.mrp ? Number(product.mrp) : 0;
  const priceNum = Number(product.price);
  const pct = mrpNum > priceNum ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;

  return (
    <main>
      <div className="detail-grid">
        {/* Gallery */}
        <div className="gallery-wrap">
          <div
            className="gallery"
            onClick={() => product.media?.[selImg] && !imgFailed && setZoomOpen(true)}
            style={
              product.media?.[selImg] && !imgFailed
                ? { cursor: 'zoom-in' }
                : undefined
            }
          >
            {product.media?.[selImg] && !imgFailed ? (
              <>
                <Image
                  src={product.media[selImg]}
                  alt={product.title}
                  fill
                  sizes="(max-width: 860px) 100vw, 560px"
                  priority
                  onError={() => setImgFailed(true)}
                  style={{ objectFit: 'contain', padding: 32 }}
                />
                <span className="zoom-hint">🔍 Click to zoom</span>
              </>
            ) : (
              '📱'
            )}
          </div>
          {product.media && product.media.length > 1 && (
            <div className="thumb-strip">
              {product.media.map((m, i) => (
                <button
                  key={i}
                  className={`thumb-pick ${i === selImg ? 'active' : ''}`}
                  onClick={() => {
                    setSelImg(i);
                    setImgFailed(false);
                  }}
                  aria-label={`View image ${i + 1}`}
                >
                  <Image
                    src={m}
                    alt={`${product.title} ${i + 1}`}
                    fill
                    sizes="72px"
                    style={{ objectFit: 'contain', padding: 6 }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="buybox">
          <div className="eyebrow">{product.brand}</div>
          <h1 style={{ marginBottom: 4 }}>{product.title}</h1>
          <div className="muted">{product.model}</div>
          <div className="shop-price-box">
            <div className="shop-price-label">⚡ Our Shop&apos;s Price</div>
            <div className="shop-price-row">
              <span className="shop-price">
                ₹{priceNum.toLocaleString('en-IN')}
              </span>
              {pct > 0 && (
                <span className="mrp" style={{ fontSize: 17 }}>
                  M.R.P. ₹{mrpNum.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {pct > 0 && (
              <div className="shop-price-save">
                You save ₹{(mrpNum - priceNum).toLocaleString('en-IN')} ({pct}%
                off M.R.P.)
              </div>
            )}
            {product.lowestPrice != null && (
              <div className="yearly-low" style={{ marginTop: 10 }}>
                📉 Lowest price in the last year: ₹
                {Number(product.lowestPrice).toLocaleString('en-IN')}
              </div>
            )}
          </div>
          <div
            className={inStock ? 'stock-in' : 'stock-out'}
            style={{ marginTop: 6, fontSize: 13 }}
          >
            {inStock ? '● In stock' : '○ Out of stock'}
          </div>

          {/* Variant selector */}
          {product.variants && product.variants.length > 1 && (
            <div style={{ marginTop: 18 }}>
              <strong style={{ fontSize: 14 }}>Storage</strong>
              <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
                {product.variants.map((v) => {
                  const current = v.id === product.id;
                  const vOut = !v.inStock;
                  return current ? (
                    <span key={v.id} className="variant-chip active">
                      {v.variantLabel}
                    </span>
                  ) : (
                    <Link
                      key={v.id}
                      href={`/product/${v.id}`}
                      className={`variant-chip ${vOut ? 'out' : ''}`}
                    >
                      {v.variantLabel}
                      <span className="muted" style={{ fontSize: 11 }}>
                        ₹{Number(v.price).toLocaleString('en-IN')}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {product.description && (
            <p style={{ marginTop: 16, lineHeight: 1.6 }}>
              {product.description}
            </p>
          )}

          {/* Available offers */}
          {coupons.length > 0 && (
            <div className="offers-box">
              <strong style={{ fontSize: 14 }}>🏷️ Available offers</strong>
              {coupons.slice(0, 3).map((c) => (
                <div key={c.id} className="offer-line">
                  <span className="offer-tag">
                    {c.type === 'PERCENT'
                      ? `${Number(c.value)}% OFF`
                      : `₹${Number(c.value)} OFF`}
                  </span>
                  Use code <strong>{c.code}</strong>
                  {Number(c.minOrder) > 0 &&
                    ` on orders above ₹${Number(c.minOrder).toLocaleString('en-IN')}`}
                </div>
              ))}
            </div>
          )}

          {/* Store-pickup model — collect in store, no home delivery. */}
          <div className="pickup-note ready" style={{ marginTop: 16 }}>
            🏬 In-store pickup — collect from Prakash Mobile, Mannat Complex,
            Gadarwara. Pickup timing is confirmed at checkout.
          </div>

          <div className="row" style={{ marginTop: 22, flexWrap: 'wrap' }}>
            <button
              onClick={addToCart}
              disabled={!inStock}
              className="success"
              style={{ flex: 1, minWidth: 130 }}
            >
              Add to cart
            </button>
            <button className="secondary" onClick={bargain}>
              💬 Bargain
            </button>
            <button
              className="secondary"
              onClick={saveToWishlist}
              style={saved ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
            >
              {saved ? '♥ Saved' : '♡ Save'}
            </button>
          </div>
          {note && (
            <p className="muted" style={{ marginTop: 10 }}>
              {note}
            </p>
          )}

          <div className="divider" />

          <strong style={{ fontSize: 14 }}>No-cost EMI</strong>
          <div
            className="row"
            style={{ marginTop: 10, flexWrap: 'wrap', gap: 10 }}
          >
            {[3, 6, 9, 12].map((m) => (
              <span key={m} className="emi-pill">
                <span className="muted">{m} months</span>
                <b>
                  ₹
                  {Math.round(Number(product.price) / m).toLocaleString('en-IN')}
                  /mo
                </b>
              </span>
            ))}
          </div>

          {product.shop && (
            <>
              <div className="divider" />
              <strong style={{ fontSize: 14 }}>📍 Shop &amp; pickup</strong>
              <div style={{ marginTop: 6 }}>{product.shop.name}</div>
              {product.shop.address && (
                <div className="muted">{product.shop.address}</div>
              )}
              {product.shop.hours && (
                <div className="muted">Hours: {product.shop.hours}</div>
              )}
              {product.shop.phone && (
                <a href={`tel:${product.shop.phone}`} className="muted">
                  📞 {product.shop.phone}
                </a>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 36 }}>
        <strong>Specifications</strong>
        <table style={{ marginTop: 8 }}>
          <tbody>
            {Object.entries(product.specs ?? {}).map(([k, v]) => (
              <tr key={k}>
                <td className="muted">{k}</td>
                <td>{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-head" style={{ marginTop: 36, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>
          Reviews
          {reviews.length > 0 && (
            <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 12 }}>
              <span style={{ color: '#f59e0b' }}>★</span>{' '}
              {(
                reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
              ).toFixed(1)}{' '}
              <span className="muted">({reviews.length})</span>
            </span>
          )}
        </h2>
        <button className="secondary" onClick={loadSummary}>
          ✨ AI summary
        </button>
      </div>

      {/* Rating distribution */}
      {reviews.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length;
            const pctBar = (count / reviews.length) * 100;
            return (
              <div key={star} className="rating-row">
                <span className="rating-label">
                  {star} <span style={{ color: '#f59e0b' }}>★</span>
                </span>
                <div className="rating-track">
                  <div
                    className="rating-fill"
                    style={{ width: `${pctBar}%` }}
                  />
                </div>
                <span className="muted rating-count">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Write a review */}
      {isCustomer && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Write a review</strong>
          <div className="star-input" style={{ marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
              >
                {n <= (hoverRating || rating) ? '★' : '☆'}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Share your experience with this device…"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            style={{ marginTop: 10 }}
          />
          <button
            style={{ marginTop: 10 }}
            onClick={submitReview}
            disabled={posting || !rating}
          >
            {posting ? 'Posting…' : 'Submit review'}
          </button>
        </div>
      )}
      {summary && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="badge">{summary.sentiment}</div>
          <p>{summary.summary}</p>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <strong>Pros</strong>
              <ul>{summary.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
            <div style={{ flex: 1 }}>
              <strong>Cons</strong>
              <ul>{summary.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        {reviews.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 10 }}>
            <div className="row">
              <span className="stars" style={{ fontWeight: 700 }}>
                {'★'.repeat(r.rating)}
                <span style={{ color: 'var(--border)' }}>
                  {'★'.repeat(5 - r.rating)}
                </span>
              </span>
              {r.verified && (
                <span className="badge" style={{ background: 'var(--success)' }}>
                  ✓ verified
                </span>
              )}
              <span className="muted">{r.user?.name}</span>
            </div>
            {r.text && <p style={{ margin: '6px 0 0' }}>{r.text}</p>}
          </div>
        ))}
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
      </div>

      {/* Questions & Answers */}
      <h2 style={{ marginTop: 44 }}>Questions &amp; answers</h2>
      <div className="row" style={{ marginTop: 8 }}>
        <input
          placeholder="Ask about this product…"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
        />
        <button onClick={askQuestion}>Ask</button>
      </div>
      <div style={{ marginTop: 14 }}>
        {questions.map((qa) => (
          <div key={qa.id} className="card" style={{ marginBottom: 10 }}>
            <div>
              <span className="qa-tag qa-q">Q</span>
              <strong>{qa.question}</strong>
            </div>
            {qa.answer ? (
              <div style={{ marginTop: 8 }}>
                <span className="qa-tag qa-a">A</span>
                {qa.answer}
              </div>
            ) : isStaff ? (
              <AnswerBox questionId={qa.id} onAnswered={loadQuestions} />
            ) : (
              <div className="muted" style={{ marginTop: 8, marginLeft: 30 }}>
                Awaiting an answer from the store.
              </div>
            )}
          </div>
        ))}
        {questions.length === 0 && (
          <p className="muted">No questions yet — be the first to ask.</p>
        )}
      </div>

      {/* You may also like */}
      {similar.length > 0 && (
        <section style={{ marginTop: 44 }}>
          <h2>You may also like</h2>
          <div className="grid">
            {similar.map((s) => {
              const m = s.mrp ? Number(s.mrp) : 0;
              const pr = Number(s.price);
              const off = m > pr ? Math.round(((m - pr) / m) * 100) : 0;
              return (
                <Link key={s.id} href={`/product/${s.id}`} className="card">
                  {off > 0 && <span className="discount-badge">-{off}%</span>}
                  <div className="product-thumb">
                    {s.media?.[0] ? (
                      <Image
                        src={s.media[0]}
                        alt={s.title}
                        fill
                        sizes="240px"
                        style={{ objectFit: 'contain', padding: 12 }}
                      />
                    ) : (
                      '📱'
                    )}
                  </div>
                  <strong>{s.title}</strong>
                  <div className="muted">
                    {s.brand} {s.model}
                  </div>
                  <div className="price-row">
                    <span className="price" style={{ margin: 0 }}>
                      ₹{pr.toLocaleString('en-IN')}
                    </span>
                    {off > 0 && (
                      <>
                        <span className="mrp">₹{m.toLocaleString('en-IN')}</span>
                        <span className="discount">{off}% off</span>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Zoom lightbox */}
      {zoomOpen && product.media?.[selImg] && (
        <div className="zoom-overlay" onClick={() => setZoomOpen(false)}>
          <button className="zoom-close" aria-label="Close">
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.media[selImg]}
            alt={product.title}
            className="zoom-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

function AnswerBox({
  questionId,
  onAnswered,
}: {
  questionId: string;
  onAnswered: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.patch(`/products/questions/${questionId}/answer`, {
        answer: text,
      });
      toast('Answer posted ✓');
      onAnswered();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <input
        placeholder="Answer this question…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button onClick={submit} disabled={busy || !text.trim()}>
        {busy ? '…' : 'Answer'}
      </button>
    </div>
  );
}
