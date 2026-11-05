import type { Role } from './rbac';

export type PartnerType = 'supplier' | 'provider';
export type OrderStatus = string;
export type BookingStatus = string;

export interface Partner {
  id: string;
  type: PartnerType;
  name: string;
  owner: string;
  email: string;
  phone: string;
  city: string;
  logo: string;
  cover: string;
  rating: number;
  commission: number;
  status: string;
  joinedAt: string;
  docs: { label: string; ok: boolean }[];
}

export interface Product {
  id: string;
  partnerId: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  stockTarget: number;
  priceConfirmed: boolean;
  brandPartnershipStatus: string;
  brandApprovalStatus: 'pending' | 'published' | 'rejected';
  storeApprovalStatus: 'pending' | 'published' | 'rejected';
  partnerStatus: string;
  status: string;
  sizes: string[];
  images: string[];
  approvalStatus: 'pending' | 'published' | 'rejected';
  description: string;
  createdAt: string;
}

export interface BusinessService {
  id: string;
  partnerId: string;
  businessName: string;
  category: string;
  coverUrl: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationMinutes: number;
  active: boolean;
  approvalStatus: 'pending' | 'published' | 'rejected';
  priceConfirmed: boolean;
  businessApprovalStatus: 'pending' | 'published' | 'rejected';
  partnerStatus: string;
}

export interface Customer {
  name: string;
  email: string;
  avatar: string;
}

export interface OrderItem {
  title: string;
  size: string;
  qty: number;
  price: number;
  image: string;
}

export interface Order {
  id: string;
  displayId: string;
  partnerId: string;
  customer: Customer;
  items: OrderItem[];
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Booking {
  id: string;
  partnerId: string;
  stylistId: string;
  stylistName: string;
  partnerName: string;
  customer: Customer;
  service: string;
  price: number;
  currency: string;
  startsAt: string;
  status: BookingStatus;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  partnerId?: string;
  avatar?: string;
}
