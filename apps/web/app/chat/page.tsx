'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import { api, getRole, getToken } from '../../lib/api';
import { connectChat } from '../../lib/socket';

interface Thread {
  id: string;
  product?: { title: string } | null;
}
interface Message {
  id: string;
  senderId: string;
  body?: string;
  offerAmount?: string | null;
  offerStatus?: string | null;
}

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [offer, setOffer] = useState('');
  const [meId, setMeId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const role = getRole();
  const isStaff = role === 'OWNER' || role === 'EMPLOYEE';
  const router = useRouter();

  // Load threads + connect the socket once.
  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api
      .get<{ id: string }>('/auth/me')
      .then((u) => setMeId(u.id))
      .catch(() => {});
    const fromUrl = new URLSearchParams(window.location.search).get('thread');
    api.get<Thread[]>('/chat/threads').then((t) => {
      setThreads(t);
      setActive(fromUrl ?? t[0]?.id ?? null);
    });

    const socket = connectChat();
    socketRef.current = socket;
    socket.on('message:new', (m: Message) => setMessages((p) => [...p, m]));
    socket.on('offer:new', (m: Message) => setMessages((p) => [...p, m]));
    socket.on('offer:update', (m: Message) =>
      setMessages((p) => p.map((x) => (x.id === m.id ? m : x))),
    );
    return () => {
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join the active thread + load its history.
  useEffect(() => {
    if (!active || !socketRef.current) return;
    socketRef.current.emit('thread:join', { threadId: active });
    api.get<Message[]>(`/chat/threads/${active}/messages`).then(setMessages);
  }, [active]);

  function send() {
    if (!text.trim() || !active) return;
    socketRef.current?.emit('message:send', { threadId: active, text });
    setText('');
  }
  function makeOffer() {
    const amount = Number(offer);
    if (!amount || !active) return;
    socketRef.current?.emit('offer:make', { threadId: active, amount });
    setOffer('');
  }
  function respond(messageId: string, status: 'ACCEPTED' | 'REJECTED') {
    socketRef.current?.emit('offer:respond', {
      threadId: active,
      messageId,
      status,
    });
  }

  return (
    <main>
      <h1>Bargaining</h1>
      <div className="chat-wrap">
        <div className="chat-threads">
          <div className="muted">Threads</div>
          {threads.map((t) => (
            <div
              key={t.id}
              className="card"
              style={{
                padding: 10,
                cursor: 'pointer',
                borderColor: t.id === active ? 'var(--accent2)' : undefined,
              }}
              onClick={() => setActive(t.id)}
            >
              {t.product?.title ?? 'General'}
            </div>
          ))}
          {threads.length === 0 && (
            <p className="muted">Start a bargain from a product page.</p>
          )}
        </div>

        <div className="chat-main">
          {!active ? (
            <p className="muted">Select a thread.</p>
          ) : (
            <>
              <div
                className="card chat-log"
                style={{ minHeight: 280, maxHeight: 380, overflowY: 'auto' }}
              >
                {messages.map((m) => {
                  const mine = meId != null && m.senderId === meId;
                  return (
                    <div
                      key={m.id}
                      className={`bubble ${mine ? 'bubble-me' : 'bubble-them'}`}
                    >
                      {m.offerAmount != null ? (
                        <div>
                          <strong>💰 Offer: ₹{m.offerAmount}</strong>{' '}
                          <span
                            style={{ opacity: 0.85, fontSize: 12 }}
                          >
                            ({m.offerStatus})
                          </span>
                          {isStaff && m.offerStatus === 'PENDING' && (
                            <div className="row" style={{ marginTop: 8 }}>
                              <button
                                className="success"
                                onClick={() => respond(m.id, 'ACCEPTED')}
                              >
                                Accept
                              </button>
                              <button
                                className="secondary"
                                onClick={() => respond(m.id, 'REJECTED')}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        m.body
                      )}
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="muted">No messages yet.</p>
                )}
              </div>

              <div className="row chat-compose" style={{ marginTop: 10 }}>
                <input
                  placeholder="Type your message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                />
                <button onClick={send}>Send</button>
              </div>
              {!isStaff && (
                <div className="row chat-compose" style={{ marginTop: 10 }}>
                  <input
                    type="number"
                    placeholder="Your offer (₹)"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                  />
                  <button className="success" onClick={makeOffer}>
                    Make offer
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
