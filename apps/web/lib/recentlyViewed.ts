'use client';

const KEY = 'recently_viewed';
const MAX = 8;

export interface RecentItem {
  id: string;
  title: string;
  price: string;
  mrp?: string | null;
  image?: string;
}

export function getRecent(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function recordRecent(item: RecentItem) {
  if (typeof window === 'undefined') return;
  const list = getRecent().filter((x) => x.id !== item.id);
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}
