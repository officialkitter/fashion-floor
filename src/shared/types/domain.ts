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
  partnership_status?: 'unaffiliated' | 'pending' | 'verified';
  is_local?: boolean;
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
  category?: string;
  marketplace_category?: 'featured' | 'other-brand';
  seller_name?: string;
  rating?: number;
  review_count?: number;
  seller_rating?: number;
  seller_review_count?: number;
  units_sold?: number;
  original_price_minor?: number;
  catalog_key?: string;
  colors?: string[];
  description?: string;
  material?: string;
  fit?: string;
  care?: string;
  origin?: string;
  shipping?: string;
  returns?: string;
  authenticity?: string;
  season?: string;
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

export interface BuildingService {
  id: string;
  name: string;
  price_minor: number;
  duration_min: number;
}

export interface FashionBuilding {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string;
  rating: number;
  review_count: number;
  cover_url: string;
  description: string;
  services: BuildingService[];
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
  color?: string;
  image_url: string;
  brand_tag: BrandTag;
}

export interface SalonCartItem extends CartItemBase {
  kind: 'salon';
  stylist_id: string;
  building_name?: string;
  slot_id: string;
  starts_at: string;
  duration_min: number;
}

/** Discriminated union: the unified cart treats both kinds uniformly. */
export type CartItem = ProductCartItem | SalonCartItem;
