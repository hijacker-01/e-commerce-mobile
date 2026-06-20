// Minimal in-app routing (no extra native nav deps).
export type Route =
  | { name: 'login' }
  | { name: 'catalog' }
  | { name: 'product'; id: string }
  | { name: 'cart' }
  | { name: 'orders' }
  | { name: 'notifications' }
  | { name: 'exchange' };

export interface NavProps {
  go: (route: Route) => void;
  back: () => void;
}
