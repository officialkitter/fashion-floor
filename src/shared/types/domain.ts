/**
 * Domain contracts shared with the Fastify/Supabase backend.
 * Field names stay snake_case so API payloads map 1:1 with no transform layer.
 */

export type Status =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'available'
  | 'held'
  | 'taken'
  | 'booked'
  | 'cancelled'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'error';

export type ProductStatus = Extract<Status, 'in_stock' | 'low_stock' | 'out_of_stock'>;
export type SlotStatus = Extract<Status, 'available' | 'held' | 'taken'>;
export type CartItemStatus = Extract<Status, 'pending' | 'processing' | 'paid' | 'cancelled' | 'error'>;

export interface BrandTag {
  id: string;
  label: string;
  vendor_id: string;
  /** Overlay style on product imagery. */
  tone: 'dark' | 'light';
}

export interface SizeOption {
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  vendor_id: string;
  title: string;
  price_minor: number;
  currency: string;
  images: string[];
  brand_tag: BrandTag;
  status: ProductStatus;
  sizes: SizeOption[];
}

export interface TimeSlot {
  id: string;
  /** ISO-8601 timestamp. */
  starts_at: string;
  duration_min: number;
  price_minor: number;
  currency: string;
  status: SlotStatus;
}

export interface Stylist {
  id: string;
  vendor_id: string;
  name: string;
  role: string;
  avatar_url: string;
  rating: number;
  slots: TimeSlot[];
}

interface CartItemBase {
  id: string;
  /** Kept for order splitting server-side; never surfaced in the UI. */
  vendor_id: string;
  title: string;
  subtitle: string;
  unit_price_minor: number;
  currency: string;
  quantity: number;
  status: CartItemStatus;
  added_at: number;
}

export interface ProductCartItem extends CartItemBase {
  kind: 'product';
  product_id: string;
  size: string;
  image_url: string;
  brand_tag: BrandTag;
}

export interface SalonCartItem extends CartItemBase {
  kind: 'salon';
  stylist_id: string;
  slot_id: string;
  starts_at: string;
  duration_min: number;
}

/** Discriminated union: the unified cart treats both kinds uniformly. */
export type CartItem = ProductCartItem | SalonCartItem;
