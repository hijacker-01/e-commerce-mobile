import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { s } from '../theme';

interface ExchangeRequest {
  id: string;
  brand: string;
  model: string;
  condition: string;
  status: string;
  aiValue?: string | null;
  approvedValue?: string | null;
}

export default function ExchangeScreen() {
  const [items, setItems] = useState<ExchangeRequest[]>([]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('good');
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    api.get<ExchangeRequest[]>('/exchange/me').then(setItems).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    setMsg('Submitting (AI valuing your device)…');
    try {
      await api.post('/exchange', { brand, model, condition });
      setBrand('');
      setModel('');
      setMsg('Submitted ✓');
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <ScrollView style={s.screen}>
      <Text style={s.h1}>Exchange your device</Text>
      <View style={s.card}>
        <Text style={s.label}>Brand</Text>
        <TextInput style={s.input} value={brand} onChangeText={setBrand} />
        <Text style={s.label}>Model</Text>
        <TextInput style={s.input} value={model} onChangeText={setModel} />
        <Text style={s.label}>Condition (like new / good / fair / poor)</Text>
        <TextInput style={s.input} value={condition} onChangeText={setCondition} />
        <TouchableOpacity
          style={s.btn}
          onPress={submit}
          disabled={!brand || !model}
        >
          <Text style={s.btnText}>Get exchange value</Text>
        </TouchableOpacity>
        {msg ? <Text style={[s.muted, { marginTop: 8 }]}>{msg}</Text> : null}
      </View>

      <Text style={[s.h1, { fontSize: 18, marginTop: 8 }]}>Your requests</Text>
      {items.length === 0 && <Text style={s.muted}>Nothing submitted yet.</Text>}
      {items.map((x) => (
        <View key={x.id} style={s.card}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={[s.title, { flex: 1 }]}>
              {x.brand} {x.model}
            </Text>
            <Text style={s.badge}>{x.status}</Text>
          </View>
          <Text style={s.muted}>Condition: {x.condition}</Text>
          {x.aiValue ? <Text style={s.muted}>AI estimate: ₹{x.aiValue}</Text> : null}
          {x.approvedValue ? (
            <Text style={s.price}>Approved: ₹{x.approvedValue}</Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
