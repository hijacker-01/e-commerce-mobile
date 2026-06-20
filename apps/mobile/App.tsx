import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { clearAuth, isAuthed, loadAuth } from './src/api';
import { Route } from './src/nav';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import ProductScreen from './src/screens/ProductScreen';
import CartScreen from './src/screens/CartScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ExchangeScreen from './src/screens/ExchangeScreen';

export default function App() {
  const [ready, setReady] = useState(false);
  const [stack, setStack] = useState<Route[]>([{ name: 'login' }]);
  const route = stack[stack.length - 1];

  // Restore a persisted session on launch.
  useEffect(() => {
    loadAuth().then((authed) => {
      setStack([{ name: authed ? 'catalog' : 'login' }]);
      setReady(true);
    });
  }, []);

  const go = (r: Route) => setStack((s) => [...s, r]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const reset = (r: Route) => setStack([r]);

  async function logout() {
    await clearAuth();
    reset({ name: 'login' });
  }

  function render() {
    switch (route.name) {
      case 'login':
        return <LoginScreen go={reset} back={back} />;
      case 'catalog':
        return <CatalogScreen go={go} back={back} />;
      case 'product':
        return <ProductScreen id={route.id} go={go} back={back} />;
      case 'cart':
        return <CartScreen go={go} back={back} />;
      case 'orders':
        return <OrdersScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'exchange':
        return <ExchangeScreen />;
    }
  }

  if (!ready) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}
      >
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const authed = isAuthed() && route.name !== 'login';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      {authed && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            maxHeight: 48,
            backgroundColor: colors.panel,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          }}
          contentContainerStyle={{ alignItems: 'center', gap: 16, paddingHorizontal: 16 }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>⚡ Store</Text>
          <NavLink label="Shop" onPress={() => reset({ name: 'catalog' })} />
          <NavLink label="Cart" onPress={() => go({ name: 'cart' })} />
          <NavLink label="Orders" onPress={() => go({ name: 'orders' })} />
          <NavLink label="Alerts" onPress={() => go({ name: 'notifications' })} />
          <NavLink label="Exchange" onPress={() => go({ name: 'exchange' })} />
          <TouchableOpacity onPress={logout}>
            <Text style={{ color: colors.danger }}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      <View style={{ flex: 1 }}>{render()}</View>
    </SafeAreaView>
  );
}

function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={{ color: colors.muted }}>{label}</Text>
    </TouchableOpacity>
  );
}
