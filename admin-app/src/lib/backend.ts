import type { Booking, Customer, Order, OrderItem, Partner, Product } from './data';
import type { Role } from './rbac';
import { supabase } from './supabase';

type Row = Record<string, unknown>;

const value = (row: Row, ...keys: string[]) => {
  for (const key of keys) {
    const result = row?.[key];
    if (result !== null && result !== undefined) return result;
  }
  return undefined;
};
const text = (input: unknown, fallback = '') => (input === null || input === undefined ? fallback : String(input));
const numeric = (input: unknown) => {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : 0;
};
const list = (input: unknown): unknown[] => (Array.isArray(input) ? input : []);
const isRow = (input: unknown): input is Row =>
  input !== null && typeof input === 'object' && !Array.isArray(input);
const nested = (row: Row, ...keys: string[]) => {
  const found = value(row, ...keys);
  return isRow(found) ? found : {};
};
const customerFrom = (row: Row): Customer => {
  const customer = nested(row, 'customer', 'customer_profile', 'profiles');
  return {
    name: text(value(customer, 'name', 'full_name', 'display_name') ?? value(row, 'customer_name', 'full_name'), 'Customer'),
    email: text(value(customer, 'email') ?? value(row, 'customer_email', 'email')),
    avatar: text(value(customer, 'avatar_url', 'avatar')),
  };
};
const relationList = (row: Row, ...keys: string[]) => list(value(row, ...keys)).filter(isRow);

export function roleFrom(value_: unknown): Role | null {
  const key = text(value_).toLowerCase();
  const aliases: Record<string, Role> = {
    owner: 'super_admin',
    superadmin: 'super_admin',
    super_admin: 'super_admin',
    admin: 'admin',
    finance: 'finance',
    support: 'support',
    supplier: 'supplier',
    provider: 'provider',
  };
  return aliases[key] ?? null;
}

export function profileFrom(row: Row, authUser: { id: string; email?: string }): { id: string; name: string; email: string; avatar?: string } {
  return {
    id: authUser.id,
    name: text(value(row, 'full_name', 'display_name', 'name'), authUser.email ?? 'Fashion Floor user'),
    email: text(value(row, 'email'), authUser.email ?? ''),
    avatar: text(value(row, 'avatar_url', 'avatar')),
  };
}

export function orderFrom(row: Row): Order {
  const items = relationList(row, 'items', 'order_items', 'line_items').map((item: Row): OrderItem => {
    const product = nested(item, 'product', 'products');
    const minorPrice = value(item, 'unit_price_minor');
    return {
      title: text(value(item, 'title', 'name', 'product_name') ?? value(product, 'name', 'title'), 'Item'),
      size: text(value(item, 'size', 'variant')),
      qty: numeric(value(item, 'qty', 'quantity')),
      price: minorPrice !== undefined ? numeric(minorPrice) / 100 : numeric(value(item, 'unit_price', 'price', 'amount')),
      image: text(value(item, 'image', 'image_url', 'imageUrl') ?? value(product, 'image_url', 'image')),
    };
  });
  const subtotalMinor = value(row, 'subtotal_minor');
  const shippingMinor = value(row, 'shipping_minor');
  return {
    id: text(value(row, 'id', 'order_id')),
    displayId: text(value(row, 'order_number', 'reference', 'id')),
    partnerId: text(value(row, 'vendor_id', 'partner_id', 'supplier_id')),
    customer: customerFrom(row),
    items,
    total: subtotalMinor !== undefined
      ? (numeric(subtotalMinor) + numeric(shippingMinor)) / 100
      : numeric(value(row, 'total', 'total_amount', 'amount', 'grand_total')),
    currency: text(value(row, 'currency', 'currency_code'), 'TZS'),
    status: text(value(row, 'status'), 'unknown'),
    createdAt: text(value(row, 'created_at', 'ordered_at')),
  };
}

export function bookingFrom(row: Row): Booking {
  const stylist = nested(row, 'stylist', 'staff', 'team_member');
  const partner = nested(row, 'partner', 'business', 'provider');
  const service = nested(row, 'service_details', 'service');
  return {
    id: text(value(row, 'id', 'booking_id')),
    partnerId: text(value(row, 'vendor_id', 'partner_id', 'provider_id') ?? value(partner, 'vendor_id', 'id')),
    stylistId: text(value(row, 'stylist_id', 'staff_id') ?? value(stylist, 'id')),
    stylistName: text(value(row, 'stylist_name', 'staff_name') ?? value(stylist, 'name', 'full_name'), 'Service provider'),
    partnerName: text(value(row, 'partner_name', 'business_name') ?? value(partner, 'name')),
    customer: customerFrom(row),
    service: text(value(row, 'service_name', 'service_title', 'title') ?? (typeof row.service === 'string' ? row.service : undefined) ?? value(service, 'name', 'title'), 'Appointment'),
    price: value(row, 'price_minor') !== undefined
      ? numeric(value(row, 'price_minor')) / 100
      : numeric(value(row, 'price', 'service_price', 'amount', 'total_amount') ?? value(service, 'price')),
    startsAt: (() => {
      const start = text(value(row, 'starts_at', 'start_at', 'scheduled_at', 'booking_date'));
      const time = text(value(row, 'start_time', 'booking_time'));
      return start && /^\d{4}-\d{2}-\d{2}$/.test(start) && time ? `${start}T${time}` : start;
    })(),
    status: text(value(row, 'status'), 'unknown'),
    currency: text(value(row, 'currency', 'currency_code')),
  };
}

export function productFrom(row: Row): Product {
  const images = list(value(row, 'images', 'image_urls')).map(String);
  const image = text(value(row, 'image_url', 'image', 'thumbnail_url'));
  const stock = numeric(value(row, 'stock', 'stock_quantity', 'quantity'));
  const sizes = list(value(row, 'sizes', 'available_sizes'))
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'size' in entry) {
        const size = text(entry.size);
        const available = 'stock' in entry ? numeric(entry.stock) : null;
        return available === null ? size : `${size} · ${available}`;
      }
      return '';
    })
    .filter(Boolean);
  return {
    id: text(value(row, 'id', 'product_id')),
    partnerId: text(value(row, 'vendor_id', 'partner_id', 'supplier_id', 'business_id')),
    title: text(value(row, 'title', 'name', 'product_name'), 'Product'),
    category: text(value(row, 'category', 'category_name')),
    price: value(row, 'price_minor') !== undefined
      ? numeric(value(row, 'price_minor')) / 100
      : numeric(value(row, 'price', 'unit_price')),
    currency: text(value(row, 'currency', 'currency_code'), 'TZS'),
    stock,
    status: text(value(row, 'status'), value(row, 'is_active') === false
      ? 'inactive'
      : stock <= 0 ? 'out_of_stock' : stock <= 3 ? 'low_stock' : 'in_stock'),
    sizes,
    images: images.length ? images : image ? [image] : [],
  };
}

export function partnerFrom(row: Row): Partner {
  const owner = nested(row, 'owner', 'profile', 'profiles');
  const type = text(value(row, 'vendor_type', 'type', 'partner_type', 'business_type')).toLowerCase();
  return {
    id: text(value(row, 'id', 'partner_id')),
    type: ['provider', 'stylist', 'salon', 'barber'].some((term) => type.includes(term)) ? 'provider' : 'supplier',
    name: text(value(row, 'name', 'business_name', 'display_name'), 'Partner'),
    owner: text(value(row, 'owner_name', 'contact_name', 'full_name') ?? value(owner, 'name', 'full_name', 'display_name')),
    email: text(value(row, 'email', 'contact_email') ?? value(owner, 'email')),
    phone: text(value(row, 'phone', 'phone_number')),
    city: text(value(row, 'city', 'location')),
    logo: text(value(row, 'logo_url', 'logo')),
    cover: text(value(row, 'cover_url', 'cover_image_url', 'cover')),
    rating: numeric(value(row, 'rating', 'average_rating')),
    commission: numeric(value(row, 'commission_rate', 'commission')),
    status: text(value(row, 'verification_status', 'partner_status', 'status'), 'unknown'),
    joinedAt: text(value(row, 'created_at', 'joined_at')),
    docs: list(value(row, 'documents')).filter(isRow).map((doc) => ({
      label: text(value(doc, 'label', 'name'), 'Document'),
      ok: Boolean(value(doc, 'verified', 'approved', 'ok')),
    })),
  };
}

export async function fetchAdminData() {
  if (!supabase) throw new Error('Supabase is not configured for live mode.');
  const [orders, bookings, products, partners] = await Promise.all([
    supabase.from('admin_orders').select('*'),
    supabase.from('admin_bookings').select('*'),
    supabase.from('admin_products').select('*'),
    supabase.from('admin_partners').select('*'),
  ]);
  for (const result of [orders, bookings, products, partners]) {
    if (result.error) throw result.error;
  }
  return {
    orders:     (orders.data ?? []).map((row) => orderFrom(row as Row)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    bookings: (bookings.data ?? []).map((row) => bookingFrom(row as Row)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    products: (products.data ?? []).map((row) => productFrom(row as Row)),
    partners: (partners.data ?? []).map((row) => partnerFrom(row as Row)),
  };
}
