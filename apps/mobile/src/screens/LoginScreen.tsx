import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api, setAuth } from '../api';
import { NavProps } from '../nav';
import { s } from '../theme';

interface AuthResp {
  accessToken: string;
}
interface Me {
  role: string;
}

export default function LoginScreen({ go }: NavProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('9000000001');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const resp =
        mode === 'login'
          ? await api.post<AuthResp>('/auth/login', { phone, password })
          : await api.post<AuthResp>('/auth/register', {
              name,
              phone,
              password,
              role: 'CUSTOMER',
            });
      setAuth(resp.accessToken, 'CUSTOMER');
      const me = await api.get<Me>('/auth/me');
      setAuth(resp.accessToken, me.role);
      go({ name: 'catalog' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <Text style={s.h1}>{mode === 'login' ? 'Log in' : 'Create account'}</Text>
      {mode === 'register' && (
        <>
          <Text style={s.label}>Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} />
        </>
      )}
      <Text style={s.label}>Phone</Text>
      <TextInput
        style={s.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Text style={s.label}>Password</Text>
      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text style={s.error}>{error}</Text>}
      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}>
        <Text style={s.btnText}>
          {busy ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        <Text style={[s.muted, { marginTop: 14 }]}>
          {mode === 'login'
            ? 'No account? Register'
            : 'Have an account? Log in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
