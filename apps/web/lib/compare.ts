'use client';

const KEY = 'compare';
export const MAX_COMPARE = 4;

export function getCompare(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event('app:compare'));
}

export type ToggleResult = 'added' | 'removed' | 'full';

export function toggleCompare(id: string): ToggleResult {
  const ids = getCompare();
  const i = ids.indexOf(id);
  if (i >= 0) {
    ids.splice(i, 1);
    save(ids);
    return 'removed';
  }
  if (ids.length >= MAX_COMPARE) return 'full';
  ids.push(id);
  save(ids);
  return 'added';
}

export function clearCompare() {
  save([]);
}
