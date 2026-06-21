import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { api, Cart } from '../api';
import { NavProps } from '../nav';
import { s } from '../theme';

export default function CartScreen({ go }: NavProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    api.get<Cart>('/cart').then(setCart).catch((e) => setMsg(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function setQty(productId: string, quantity: number) {
    await api.patch(`/cart/items/${productId}`, { quantity });
    load();
  }

  async function checkout() {
    if (!cart || cart.items.length === 0) return;
    setMsg('Placing order…');
    try {
      await api.post('/orders', {
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        paymentMethod: 'UPI',
      });
      await api.del('/cart');
      setMsg('Order placed! Awaiting approval.');
      setTimeout(() => go({ name: 'orders' }), 900);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  if (!cart) return <Text style={[s.muted, s.screen]}>Loading…</Text>;

  return (
    <ScrollView style={s.screen}>
      <Text style={s.h1}>Your cart</Text>
      {cart.items.length === 0 && <Text style={s.muted}>Cart is empty.</Text>}
      {cart.items.map((i) => (
        <View key={i.productId} style={s.card}>
          <Text style={s.title}>{i.title}</Text>
          <Text style={s.muted}>
            ₹{i.unitPrice} × {i.quantity} = ₹{i.lineTotal}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[s.btn, { marginTop: 0, paddingHorizontal: 16 }]}
              onPress={() => setQty(i.productId, i.quantity + 1)}
            >
              <Text style={s.btnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { marginTop: 0, paddingHorizontal: 16, backgroundColor: '#1e293b' }]}
              onPress={() => setQty(i.productId, Math.max(0, i.quantity - 1))}
            >
              <Text style={s.btnText}>−</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text style={[s.h1, { fontSize: 18, marginTop: 8 }]}>
        Subtotal: ₹{cart.subtotal}
      </Text>
      {msg ? <Text style={s.muted}>{msg}</Text> : null}
      <TouchableOpacity
        style={[s.btn, s.btnSuccess]}
        onPress={checkout}
        disabled={cart.items.length === 0}
      >
        <Text style={s.btnTextDark}>Place order (UPI)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
