import { useState } from 'react';
import { SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { clearAuth, isAuthed } from './src/api';
import { Route } from './src/nav';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import ProductScreen from './src/screens/ProductScreen';
import CartScreen from './src/screens/CartScreen';
import OrdersScreen from './src/screens/OrdersScreen';

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ name: 'login' }]);
  const route = stack[stack.length - 1];

  const go = (r: Route) => setStack((s) => [...s, r]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const reset = (r: Route) => setStack([r]);

  function logout() {
    clearAuth();
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
    }
  }

  const authed = isAuthed() && route.name !== 'login';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      {authed && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.panel,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
            ⚡ Store
          </Text>
          <TouchableOpacity onPress={() => reset({ name: 'catalog' })}>
            <Text style={{ color: colors.muted }}>Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => go({ name: 'cart' })}>
            <Text style={{ color: colors.muted }}>Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => go({ name: 'orders' })}>
            <Text style={{ color: colors.muted }}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={{ color: colors.danger }}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ flex: 1 }}>{render()}</View>
    </SafeAreaView>
  );
}
