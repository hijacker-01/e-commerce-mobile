// E2E test for the chat-bargaining WebSocket gateway.
// Customer and owner connect to /chat, exchange a message, and run a full
// offer -> counter-respond round-trip. Run: node apps/backend/test/chat-smoke.mjs
import { io } from 'socket.io-client';

const HTTP = process.env.API_URL ?? 'http://localhost:4000';
const WS = `${HTTP}/chat`;

let passed = 0;
function check(cond, label) {
  if (!cond) throw new Error(`ASSERT FAILED: ${label}`);
  passed++;
  console.log(`  ✓ ${label}`);
}

async function rest(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${HTTP}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(WS, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 8000);
  });
}

const next = (socket, event, ms = 8000) =>
  new Promise((resolve, reject) => {
    socket.once(event, resolve);
    setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
  });

async function main() {
  console.log('Setup: owner + customer auth, thread, product');
  const owner = await rest('/auth/login', {
    method: 'POST',
    body: { phone: '9000000001', password: 'password123' },
  });
  const phone = `9${Date.now().toString().slice(-9)}`;
  const cust = await rest('/auth/register', {
    method: 'POST',
    body: { name: 'Bargainer', phone, password: 'password123', role: 'CUSTOMER' },
  });
  const products = await rest('/products');
  const thread = await rest('/chat/threads', {
    method: 'POST',
    token: cust.accessToken,
    body: { productId: products[0].id },
  });
  check(thread.id, 'chat thread created');

  console.log('Connect both parties to /chat');
  const cs = await connect(cust.accessToken);
  const os = await connect(owner.accessToken);
  check(cs.connected && os.connected, 'both sockets authenticated + connected');

  await cs.emitWithAck('thread:join', { threadId: thread.id });
  await os.emitWithAck('thread:join', { threadId: thread.id });
  check(true, 'both joined thread room');

  console.log('Customer sends a message; owner receives it live');
  const recvMsg = next(os, 'message:new');
  cs.emit('message:send', { threadId: thread.id, text: 'Best price?' });
  const msg = await recvMsg;
  check(msg.body === 'Best price?', 'owner received the chat message');

  console.log('Customer makes an offer; owner sees offer:new (PENDING)');
  const recvOffer = next(os, 'offer:new');
  cs.emit('offer:make', { threadId: thread.id, amount: 30000 });
  const offer = await recvOffer;
  check(Number(offer.offerAmount) === 30000, 'offer amount delivered');
  check(offer.offerStatus === 'PENDING', 'offer starts PENDING');

  console.log('Owner accepts; customer sees offer:update (ACCEPTED)');
  const recvUpdate = next(cs, 'offer:update');
  os.emit('offer:respond', {
    threadId: thread.id,
    messageId: offer.id,
    status: 'ACCEPTED',
  });
  const updated = await recvUpdate;
  check(updated.offerStatus === 'ACCEPTED', 'offer resolved to ACCEPTED for both');

  console.log('Unauthenticated socket is rejected');
  const bad = io(WS, { auth: { token: 'garbage' }, transports: ['websocket'] });
  const rejected = await new Promise((resolve) => {
    bad.on('disconnect', () => resolve(true));
    bad.on('connect_error', () => resolve(true));
    setTimeout(() => resolve(false), 5000);
  });
  check(rejected, 'bad token rejected by gateway');

  cs.close();
  os.close();
  bad.close();
  console.log(`\nALL ${passed} CHAT CHECKS PASSED ✅`);
  process.exit(0);
}

main().catch((e) => {
  console.error('\nCHAT TEST FAILED ❌\n', e.message);
  process.exit(1);
});
