import { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { s } from '../theme';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);

  function load() {
    api.get<Notification[]>('/notifications').then(setItems).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await api.post('/notifications/read-all');
    load();
  }

  return (
    <View style={s.screen}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[s.h1, { flex: 1 }]}>Notifications</Text>
        <TouchableOpacity onPress={markAll}>
          <Text style={s.muted}>Mark all read</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <View style={[s.card, { opacity: item.read ? 0.6 : 1 }]}>
            <Text style={s.badge}>{item.type}</Text>
            <Text style={[s.title, { marginTop: 4 }]}>{item.title}</Text>
            {item.body ? <Text style={s.muted}>{item.body}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={s.muted}>Nothing yet.</Text>}
      />
    </View>
  );
}
