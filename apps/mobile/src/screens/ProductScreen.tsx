import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { api, Product } from '../api';
import { NavProps } from '../nav';
import { s } from '../theme';

interface Review {
  id: string;
  rating: number;
  text?: string;
  verified: boolean;
}

export default function ProductScreen({
  id,
  back,
}: NavProps & { id: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    api.get<Product>(`/products/${id}`).then(setProduct).catch(() => {});
    api.get<Review[]>(`/reviews/product/${id}`).then(setReviews).catch(() => {});
  }, [id]);

  async function add() {
    try {
      await api.post('/cart/items', { productId: id, quantity: 1 });
      setNote('Added to cart ✓');
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  if (!product) return <Text style={[s.muted, s.screen]}>Loading…</Text>;

  return (
    <ScrollView style={s.screen}>
      <Text style={s.h1}>{product.title}</Text>
      <Text style={s.muted}>
        {product.brand} {product.model}
      </Text>
      <Text style={[s.price, { fontSize: 22 }]}>₹{product.price}</Text>
      {product.description ? (
        <Text style={[s.muted, { marginTop: 8 }]}>{product.description}</Text>
      ) : null}

      <View style={[s.card, { marginTop: 14 }]}>
        <Text style={s.title}>Specifications</Text>
        {Object.entries(product.specs ?? {}).map(([k, v]) => (
          <View
            key={k}
            style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}
          >
            <Text style={s.muted}>{k}</Text>
            <Text style={{ color: '#e8edf5' }}>{String(v)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.btn} onPress={add}>
        <Text style={s.btnText}>Add to cart</Text>
      </TouchableOpacity>
      {note ? <Text style={[s.muted, { marginTop: 8 }]}>{note}</Text> : null}

      <Text style={[s.h1, { fontSize: 18, marginTop: 22 }]}>Reviews</Text>
      {reviews.length === 0 && <Text style={s.muted}>No reviews yet.</Text>}
      {reviews.map((r) => (
        <View key={r.id} style={s.card}>
          <Text style={{ color: '#e8edf5' }}>
            {'★'.repeat(r.rating)}{' '}
            {r.verified ? <Text style={s.badge}>verified</Text> : null}
          </Text>
          {r.text ? (
            <Text style={[s.muted, { marginTop: 4 }]}>{r.text}</Text>
          ) : null}
        </View>
      ))}

      <TouchableOpacity style={[s.btn, { backgroundColor: '#1e293b' }]} onPress={back}>
        <Text style={s.btnText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
