'use client';

const KEY = 'addresses';

export function getAddresses(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveAddress(addr: string) {
  const a = addr.trim();
  if (!a) return;
  const list = getAddresses().filter((x) => x !== a);
  list.unshift(a);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 6)));
}

export function removeAddress(addr: string) {
  localStorage.setItem(
    KEY,
    JSON.stringify(getAddresses().filter((x) => x !== addr)),
  );
}
