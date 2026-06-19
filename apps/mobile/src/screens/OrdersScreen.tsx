import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { api, Order } from '../api';
import { s } from '../theme';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.get<Order[]>('/orders').then(setOrders).catch(() => {});
  }, []);

  return (
    <View style={s.screen}>
      <Text style={s.h1}>My orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.title}>{item.number}</Text>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}
            >
              <Text style={s.badge}>{item.status}</Text>
              <Text style={s.price}>₹{item.total}</Text>
            </View>
            <Text style={s.muted}>Payment: {item.paymentStatus}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={s.muted}>No orders yet.</Text>}
      />
    </View>
  );
}
