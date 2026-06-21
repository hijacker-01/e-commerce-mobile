// Lightweight API client for the mobile app, with persisted auth.
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

let token: string | null = null;
let role: string | null = null;

export async function setAuth(t: string, r: string) {
  token = t;
  role = r;
  await AsyncStorage.multiSet([
    ['token', t],
    ['role', r],
  ]);
}
export async function clearAuth() {
  token = null;
  role = null;
  await AsyncStorage.multiRemove(['token', 'role']);
}
/** Hydrate the in-memory session from storage on app start. */
export async function loadAuth(): Promise<boolean> {
  const [[, t], [, r]] = await AsyncStorage.multiGet(['token', 'role']);
  token = t;
  role = r;
  return !!token;
}
export function getRole() {
  return role;
}
export function isAuthed() {
  return !!token;
}

type Opts = { method?: string; body?: unknown };

async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.message ?? `Request failed (${res.status})`;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};

export interface Product {
  id: string;
  brand: string;
  model: string;
  title: string;
  description?: string;
  price: string;
  specs: Record<string, unknown>;
  inventory?: { quantity: number } | null;
}
export interface CartLine {
  productId: string;
  title: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}
export interface Cart {
  items: CartLine[];
  subtotal: string;
}
export interface Order {
  id: string;
  number: string;
  status: string;
  total: string;
  paymentStatus: string;
}
