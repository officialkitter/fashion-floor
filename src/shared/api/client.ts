import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { mockRoute } from './mocks';
import type { FashionBuilding, Product, Stylist } from '../types/domain';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS !== 'false';
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

const supabaseStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: {
        storage: supabaseStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getFromSupabase<T>(path: string): Promise<T> {
  if (!supabase) {
    throw new ApiError(
      503,
      'Live mode requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  const result = path === '/v1/boutique/products'
    ? await supabase.from('product_cards').select('*')
      .order('seller_rating', { ascending: false })
      .order('seller_review_count', { ascending: false })
      .order('units_sold', { ascending: false })
      .returns<Product[]>()
    : path === '/v1/lounge/stylists'
      ? await supabase.from('lounge_stylists').select('*').returns<Stylist[]>()
      : path === '/v1/lounge/buildings'
        ? await supabase.from('fashion_buildings').select('*').returns<FashionBuilding[]>()
        : null;

  if (!result) throw new ApiError(404, `No Supabase resource is mapped for ${path}.`);
  if (result.error) throw new ApiError(502, result.error.message);
  return result.data as T;
}

async function request<T>(path: string, timeoutMs = 10_000): Promise<T> {
  if (USE_MOCKS) return mockRoute<T>(path);
  if (supabase) return getFromSupabase<T>(path);
  if (!BASE_URL) {
    throw new ApiError(
      503,
      'Live mode requires Supabase configuration or EXPO_PUBLIC_API_URL.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`);
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Request timed out');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
};

export interface CustomerOrder {
  id: string;
  status: string;
  currency: string;
  subtotal_minor: number;
  created_at: string;
  order_items: Array<{
    title: string;
    image_url: string;
    quantity: number;
  }>;
}

export interface CustomerBooking {
  id: string;
  status: string;
  starts_at: string;
  duration_min: number;
  price_minor: number;
  currency: string;
  businesses: { name: string } | null;
  business_services: { name: string } | null;
  stylists: { name: string } | null;
}

async function requireCustomerSession() {
  if (!supabase) {
    throw new ApiError(503, 'Customer records require Supabase configuration.');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new ApiError(502, error.message);
  if (!data.session) throw new ApiError(401, 'Sign in to view your orders and bookings.');
  return supabase;
}

export async function getCustomerOrders() {
  const client = await requireCustomerSession();
  const { data, error } = await client
    .from('orders')
    .select('id,status,currency,subtotal_minor,created_at,order_items(title,image_url,quantity)')
    .order('created_at', { ascending: false })
    .returns<CustomerOrder[]>();
  if (error) throw new ApiError(502, error.message);
  return data;
}

export async function getCustomerBookings() {
  const client = await requireCustomerSession();
  const { data, error } = await client
    .from('bookings')
    .select('id,status,starts_at,duration_min,price_minor,currency,businesses(name),business_services(name),stylists(name)')
    .order('starts_at', { ascending: false })
    .returns<CustomerBooking[]>();
  if (error) throw new ApiError(502, error.message);
  return data;
}
