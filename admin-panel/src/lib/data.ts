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
  stockTarget: number;
  priceConfirmed: boolean;
  brandPartnershipStatus: string;
  brandApprovalStatus: 'pending' | 'published' | 'rejected';
  verificationReference: string;
  storeApprovalStatus: 'pending' | 'published' | 'rejected';
  partnerStatus: string;
  sizes: { size: string; stock: number }[];
  images: string[];
  active: boolean;
  approvalStatus: 'pending' | 'published' | 'rejected';
  description: string;
  createdAt: string;
}

export interface BusinessService {
  id: string;
  vendorId: string;
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
  createdAt: string;
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

export interface LoungeDirectoryLead {
  id: string;
  referenceCode: string;
  category: string;
  country: string;
  city: string | null;
  area: string | null;
  businessName: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  publishedPriceEvidence: string | null;
  status: 'awaiting_source' | 'contacted' | 'verified' | 'rejected';
  linkedBusinessId: string | null;
  createdAt: string;
}
