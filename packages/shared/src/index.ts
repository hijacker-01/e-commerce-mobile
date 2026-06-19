// Shared types & constants used by web and mobile clients.

export type Role = 'OWNER' | 'EMPLOYEE' | 'STOCKIST' | 'CUSTOMER';

export type OrderStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export interface Product {
  id: string;
  brand: string;
  model: string;
  title: string;
  description?: string;
  specs: Record<string, unknown>;
  price: string;
  mrp?: string;
  media: string[];
  videoLinks: string[];
  condition: 'NEW' | 'REFURBISHED' | 'OPEN_BOX';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Granular permission flags the owner can grant to employees.
export const PERMISSIONS = [
  'product.write',
  'order.approve',
  'invoice.create',
  'inventory.write',
  'coupon.create',
  'challan.create',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const API_ROUTES = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/auth/me',
  products: '/api/products',
  orders: '/api/orders',
} as const;
