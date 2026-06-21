'use client';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastEvent {
  id: number;
  message: string;
  kind: ToastKind;
}

/** Fire a toast from anywhere (client-side). Listened to by <Toaster />. */
export function toast(message: string, kind: ToastKind = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ToastEvent>('app:toast', {
      detail: { id: Date.now() + Math.random(), message, kind },
    }),
  );
}
