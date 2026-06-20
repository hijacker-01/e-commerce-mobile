// End-to-end smoke test against a running API + seeded DB.
// Run: node apps/backend/test/smoke.mjs  (API must be on :4000)
const BASE = process.env.API_URL ?? 'http://localhost:4000/api';

let passed = 0;
function check(cond, label) {
  if (!cond) throw new Error(`ASSERT FAILED: ${label}`);
  passed++;
  console.log(`  ✓ ${label}`);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return data;
}

async function main() {
  console.log('1. Owner login (seeded)');
  const owner = await api('/auth/login', {
    method: 'POST',
    body: { phone: '9000000001', password: 'password123' },
  });
  check(owner.accessToken, 'owner got access token');

  console.log('2. Public catalog');
  const products = await api('/products');
  check(Array.isArray(products) && products.length > 0, 'catalog has products');
  const product = products[0];
  const startStock = product.inventory?.quantity ?? 0;
  check(startStock > 0, `seeded product in stock (${startStock})`);

  console.log('3. Register a fresh customer');
  const phone = `9${Date.now().toString().slice(-9)}`;
  const cust = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Test Buyer', phone, password: 'password123', role: 'CUSTOMER' },
  });
  check(cust.accessToken, 'customer registered + token');
  const ctoken = cust.accessToken;

  console.log('4. Add to cart');
  const cart = await api('/cart/items', {
    method: 'POST',
    token: ctoken,
    body: { productId: product.id, quantity: 1 },
  });
  check(cart.items.length === 1, 'cart has 1 line');
  check(cart.subtotal === product.price, 'cart subtotal matches price');

  console.log('5. Place order with delivery slot');
  const order = await api('/orders', {
    method: 'POST',
    token: ctoken,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      deliverySlot: new Date(Date.now() + 86400000).toISOString(),
      paymentMethod: 'UPI',
    },
  });
  check(order.status === 'REQUESTED', 'order starts REQUESTED');
  check(Number(order.gstAmount) > 0, `GST computed (${order.gstAmount})`);

  console.log('6. Owner approves order (decrements stock)');
  const approved = await api(`/orders/${order.id}/status`, {
    method: 'PATCH',
    token: owner.accessToken,
    body: { status: 'APPROVED' },
  });
  check(approved.status === 'APPROVED', 'order APPROVED');
  const after = await api(`/products/${product.id}`);
  check(
    after.inventory.quantity === startStock - 1,
    `stock decremented ${startStock} -> ${after.inventory.quantity}`,
  );

  console.log('6b. Loyalty points awarded on approval');
  const loyalty = await api('/loyalty/me', { token: ctoken });
  check(loyalty.points > 0, `loyalty points earned (${loyalty.points})`);

  console.log('7. Owner generates GST invoice + warranty card');
  const invoice = await api('/invoices', {
    method: 'POST',
    token: owner.accessToken,
    body: { orderId: order.id, type: 'GST' },
  });
  check(invoice.number?.startsWith('INV-'), `invoice numbered ${invoice.number}`);
  check(
    Number(invoice.cgst) > 0 && Number(invoice.sgst) > 0,
    `intra-state CGST+SGST split (cgst=${invoice.cgst}, sgst=${invoice.sgst})`,
  );
  check(invoice.warrantyCard, 'warranty card created');
  const pdfRes = await fetch(`${BASE}/invoices/${invoice.id}/pdf`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
  });
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  check(
    pdfRes.ok && pdfBuf.subarray(0, 4).toString('latin1') === '%PDF',
    `GST invoice PDF generated (${pdfBuf.length} bytes)`,
  );

  console.log('8. Coupon: owner creates, customer applies');
  const code = `SAVE${Date.now().toString().slice(-5)}`;
  await api('/coupons', {
    method: 'POST',
    token: owner.accessToken,
    body: { code, type: 'PERCENT', value: 10 },
  });
  const order2 = await api('/orders', {
    method: 'POST',
    token: ctoken,
    body: { items: [{ productId: product.id, quantity: 1 }], paymentMethod: 'COD' },
  });
  const discounted = await api('/coupons/apply', {
    method: 'POST',
    token: ctoken,
    body: { orderId: order2.id, code },
  });
  check(Number(discounted.discount) > 0, `coupon discount applied (${discounted.discount})`);

  console.log('9. RBAC: customer cannot approve orders (expect 403)');
  let forbidden = false;
  try {
    await api(`/orders/${order2.id}/status`, {
      method: 'PATCH',
      token: ctoken,
      body: { status: 'APPROVED' },
    });
  } catch (e) {
    forbidden = /403/.test(e.message);
  }
  check(forbidden, 'customer blocked from approving (RBAC works)');

  console.log('10. Notification raised on order approval');
  const notifs = await api('/notifications', { token: ctoken });
  check(
    notifs.some((n) => n.type === 'order' && /APPROVED/.test(n.title)),
    'customer got order-approved notification',
  );
  const unread = await api('/notifications/unread-count', { token: ctoken });
  check(unread.count >= 1, `unread count tracked (${unread.count})`);

  console.log('11. Owner analytics summary');
  const stats = await api('/analytics/summary', { token: owner.accessToken });
  check(Number(stats.inventoryValue) > 0, `inventory valued (${stats.inventoryValue})`);
  check(stats.topProducts.length >= 1, 'top products computed');
  check(
    Number(stats.gstCollected) > 0,
    `GST collected aggregated (${stats.gstCollected})`,
  );

  console.log('12. Credit model: apply → owner sets terms → ledger');
  const me = await api('/auth/me', { token: ctoken });
  await api('/credit/apply', { method: 'POST', token: ctoken });
  await api(`/credit/${me.id}/terms`, {
    method: 'PUT',
    token: owner.accessToken,
    body: { limit: 50000, tenureDays: 30 },
  });
  await api(`/credit/${me.id}/ledger`, {
    method: 'POST',
    token: owner.accessToken,
    body: { amount: 10000, reason: 'EMI purchase' },
  });
  const credit = await api('/credit/me', { token: ctoken });
  check(credit.status === 'ACTIVE', 'credit account activated by owner');
  check(Number(credit.balance) === 10000, `ledger balance tracked (${credit.balance})`);
  const ownerView = await api(`/credit/${me.id}`, { token: owner.accessToken });
  check(Number(ownerView.balance) === 10000, 'owner can view customer credit');

  console.log('13. Exchange portal: submit → owner approves');
  const ex = await api('/exchange', {
    method: 'POST',
    token: ctoken,
    body: { brand: 'Apple', model: 'iPhone 12', condition: 'good' },
  });
  check(['SUBMITTED', 'AI_VALUED'].includes(ex.status), 'exchange submitted');
  const reviewed = await api(`/exchange/${ex.id}`, {
    method: 'PATCH',
    token: owner.accessToken,
    body: { decision: 'approve', approvedValue: 22000 },
  });
  check(reviewed.status === 'APPROVED', 'owner approved exchange');
  check(Number(reviewed.approvedValue) === 22000, 'approved value set');

  console.log('14. Stockist supply: register → challan → receive (stock up)');
  const before = await api(`/products/${product.id}`);
  const beforeQty = before.inventory?.quantity ?? 0;
  const stockist = await api('/stockists', {
    method: 'POST',
    token: owner.accessToken,
    body: { name: 'Acme Distributors', gstin: '27ZZZZZ1234Z1Z5' },
  });
  check(stockist.id, 'stockist registered');
  const challan = await api('/stockists/challans', {
    method: 'POST',
    token: owner.accessToken,
    body: {
      stockistId: stockist.id,
      items: [
        { productId: product.id, name: product.title, quantity: 5, rate: 25000 },
      ],
    },
  });
  check(challan.number?.startsWith('CH-'), `challan issued ${challan.number}`);
  check(Number(challan.totalAmount) === 125000, 'challan total computed');
  await api(`/stockists/challans/${challan.id}/receive`, {
    method: 'POST',
    token: owner.accessToken,
  });
  const restocked = await api(`/products/${product.id}`);
  check(
    restocked.inventory.quantity === beforeQty + 5,
    `inventory increased ${beforeQty} -> ${restocked.inventory.quantity}`,
  );

  console.log('15. Health check');
  const health = await api('/health');
  check(health.status === 'ok' && health.db === 'up', 'health reports DB up');

  console.log('16. Wishlist: add → list → remove');
  const wl = await api(`/wishlist/${product.id}`, { method: 'POST', token: ctoken });
  check(wl.some((w) => w.productId === product.id), 'product added to wishlist');
  const wl2 = await api(`/wishlist/${product.id}`, {
    method: 'DELETE',
    token: ctoken,
  });
  check(!wl2.some((w) => w.productId === product.id), 'product removed from wishlist');

  console.log('17. Returns/RMA: request → owner approves');
  const ret = await api('/returns', {
    method: 'POST',
    token: ctoken,
    body: { orderId: order.id, reason: 'Defective unit' },
  });
  check(ret.status === 'REQUESTED', 'return requested');
  const decided = await api(`/returns/${ret.id}`, {
    method: 'PATCH',
    token: owner.accessToken,
    body: { decision: 'approve' },
  });
  check(decided.status === 'APPROVED', 'owner approved return');

  console.log(`\nALL ${passed} CHECKS PASSED ✅`);
}

main().catch((e) => {
  console.error('\nSMOKE TEST FAILED ❌\n', e.message);
  process.exit(1);
});
