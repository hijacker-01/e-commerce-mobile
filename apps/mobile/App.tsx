import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Product } from '@ecom/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setError('Backend not reachable. Run `npm run backend`.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Electronics Store</Text>
      {loading && <ActivityIndicator color="#fff" />}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {item.brand} {item.model}
            </Text>
            <Text style={styles.price}>₹{item.price}</Text>
          </View>
        )}
        ListEmptyComponent={
          !loading && !error ? <Text style={styles.meta}>No products yet.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 20, paddingTop: 60 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  meta: { color: '#9aa4b2' },
  error: { color: '#ff6b6b', marginBottom: 12 },
  card: {
    backgroundColor: '#131c2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardMeta: { color: '#9aa4b2', fontSize: 13, marginTop: 2 },
  price: { color: '#4ade80', fontSize: 15, fontWeight: '700', marginTop: 8 },
});
