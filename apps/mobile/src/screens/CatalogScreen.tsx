import { useEffect, useState } from 'react';
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, Product } from '../api';
import { NavProps } from '../nav';
import { s } from '../theme';

export default function CatalogScreen({ go }: NavProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    try {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      setProducts(await api.get<Product[]>(`/products${qs}`));
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(id: string) {
    try {
      await api.post('/cart/items', { productId: id, quantity: 1 });
      setNote('Added to cart ✓');
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  return (
    <View style={s.screen}>
      <Text style={s.h1}>Shop</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[s.input, { flex: 1, marginTop: 0 }]}
          placeholder="Search devices…"
          placeholderTextColor="#5b6678"
          value={q}
          onChangeText={setQ}
        />
        <TouchableOpacity style={[s.btn, { marginTop: 0 }]} onPress={load}>
          <Text style={s.btnText}>Search</Text>
        </TouchableOpacity>
      </View>
      {note && <Text style={[s.muted, { marginTop: 8 }]}>{note}</Text>}
      <FlatList
        style={{ marginTop: 12 }}
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={s.card}>
            <TouchableOpacity
              onPress={() => go({ name: 'product', id: item.id })}
            >
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.muted}>
                {item.brand} {item.model}
              </Text>
            </TouchableOpacity>
            <Text style={s.price}>₹{item.price}</Text>
            <TouchableOpacity style={s.btn} onPress={() => add(item.id)}>
              <Text style={s.btnText}>Add to cart</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={s.muted}>No products.</Text>}
      />
    </View>
  );
}
