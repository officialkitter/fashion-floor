import type { Role } from './rbac';

export type OrderStatus = 'pending' | 'processing' | 'paid' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PartnerStatus = 'approved' | 'pending' | 'suspended' | 'rejected';
export type PartnerType = 'supplier' | 'provider';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
  vendorId: string | null;
}

export interface OrderItem {
  id: string;
  title: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  image: string;
}

export interface Order {
  id: string;
  vendorId: string;
  vendorName: string;
  customer: { name: string; email: string };
  items: OrderItem[];
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Booking {
  id: string;
  vendorId: string;
  businessName: string;
  stylistId: string;
  stylistName: string;
  stylistAvatar: string;
  customer: { name: string; email: string };
  service: string;
  price: number;
  currency: string;
  startsAt: string;
  status: BookingStatus;
}

export interface Product {
  id: string;
  vendorId: string;
  storeName: string;
  brandName: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  sizes: { size: string; stock: number }[];
  images: string[];
  active: boolean;
}

export interface Partner {
  id: string;
  type: PartnerType;
  name: string;
  owner: string;
  email: string;
  city: string;
  status: PartnerStatus;
  active: boolean;
  createdAt: string;
}
