'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Booking, BookingStatus, LoungeDirectoryLead, Order, OrderStatus, Partner, Product, AdminUser } from './data';
import { getSupabase, hasSupabaseConfig } from './supabase';
import type { Permission, Role } from './rbac';

const PERMISSIONS: Permission[] = [
  'dashboard.view', 'orders.view', 'orders.manage', 'bookings.view', 'bookings.manage',
  'catalog.view', 'catalog.manage', 'partners.view', 'partners.manage', 'team.view',
  'team.manage', 'roles.view', 'roles.edit', 'finance.view',
];

type QueryKey = 'orders' | 'bookings' | 'products' | 'partners' | 'loungeLeads';
interface StoreValue {
  ready: boolean;
  dataLoading: boolean;
  configMissing: boolean;
  authError: string | null;
  queryErrors: Partial<Record<QueryKey, string>>;
  user: AdminUser | null;
  role: Role | null;
  permissions: Permission[];
  orders: Order[];
  bookings: Booking[];
  products: Product[];
  partners: Partner[];
  loungeLeads: LoungeDirectoryLead[];
  login: (email: string, password: string) => Promise<{ ok: boolean; reason?: string }>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  refresh: () => Promise<void>;
  setOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  setBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);
const errorText = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.';
const roleList: Role[] = ['super_admin', 'admin', 'finance', 'support', 'supplier', 'provider'];
const roleIsValid = (value: string): value is Role => roleList.includes(value as Role);

function mapOrder(row: any): Order {
  const items = (row.items ?? []) as any[];
  return {
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name ?? '',
    customer: { name: row.customer_name || 'Customer', email: row.customer_email || '' },
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      size: item.size ?? '',
      color: item.color ?? '',
      qty: item.quantity,
      price: Number(item.unit_price_minor) / 100,
      image: item.image_url ?? '',
    })),
    total: (Number(row.subtotal_minor) + Number(row.shipping_minor)) / 100,
    currency: row.currency || 'TZS',
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapBooking(row: any): Booking {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    businessName: row.business_name ?? '',
    stylistId: row.stylist_id,
    stylistName: row.stylist_name ?? '',
    stylistAvatar: row.stylist_avatar ?? '',
    customer: { name: row.customer_name || 'Customer', email: row.customer_email || '' },
    service: row.service_name ?? '',
    price: Number(row.price_minor) / 100,
    currency: row.currency || 'TZS',
    startsAt: row.starts_at,
    status: row.status,
  };
}

function mapProduct(row: any): Product {
  const sizes = Array.isArray(row.sizes) ? row.sizes : [];
  return {
    id: row.id,
    vendorId: row.vendor_id,
    storeName: row.store_name ?? '',
    brandName: row.brand_name ?? '',
    title: row.title,
    category: row.category,
    price: Number(row.price_minor) / 100,
    currency: row.currency || 'TZS',
    stock: Number(row.stock ?? 0),
    sizes,
    images: row.images ?? [],
    active: Boolean(row.is_active),
  };
}

function mapPartner(row: any): Partner {
  return {
    id: row.id,
    type: row.partner_type,
    name: row.name,
    owner: row.owner_name ?? '',
    email: row.owner_email ?? '',
    city: row.city ?? '',
    status: row.verification_status,
    active: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

function mapLoungeLead(row: any): LoungeDirectoryLead {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    category: row.category,
    country: row.country,
    city: row.city,
    area: row.area,
    businessName: row.business_name,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    publishedPriceEvidence: row.published_price_evidence,
    status: row.status,
    linkedBusinessId: row.linked_business_id,
    createdAt: row.created_at,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [queryErrors, setQueryErrors] = useState<Partial<Record<QueryKey, string>>>({});
  const [user, setUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loungeLeads, setLoungeLeads] = useState<LoungeDirectoryLead[]>([]);

  const clearData = useCallback(() => {
    setUser(null);
    setPermissions([]);
    setOrders([]);
    setBookings([]);
    setProducts([]);
    setPartners([]);
    setLoungeLeads([]);
    setQueryErrors({});
    setDataLoading(false);
  }, []);

  const loadIdentity = useCallback(async (session: Session | null): Promise<boolean> => {
    const supabase = getSupabase();
    if (!session?.user || !supabase) {
      clearData();
      setAuthError(null);
      return false;
    }

    const [{ data: roleRow, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from('user_roles').select('role,vendor_id,is_active').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('profiles').select('display_name,avatar_url,email').eq('id', session.user.id).maybeSingle(),
    ]);

    if (roleError || profileError) {
      clearData();
      setAuthError(`Could not load your account details: ${errorText(roleError ?? profileError)}.`);
      return false;
    }
    if (!roleRow) {
      clearData();
      setAuthError('No active admin role is available for this account. It may be unassigned or suspended. Contact a Fashion Floor administrator.');
      return false;
    }
    if (!roleRow.is_active) {
      clearData();
      setAuthError('This account is suspended. Contact a Fashion Floor administrator.');
      return false;
    }
    if (!roleIsValid(roleRow.role)) {
      clearData();
      setAuthError('This account has an unsupported role. Contact a Fashion Floor administrator.');
      return false;
    }

    try {
      const checks = await Promise.all(PERMISSIONS.map(async (permission) => {
        const { data, error } = await supabase.rpc('has_permission', { permission_key: permission });
        if (error) throw new Error(`Could not verify access rules: ${error.message}`);
        return data ? permission : null;
      }));
      if (!checks.includes('dashboard.view')) {
        clearData();
        setAuthError('This account has no active permissions. It may be suspended or its business account may be inactive. Contact a Fashion Floor administrator.');
        return false;
      }
      setAuthError(null);
      setUser({
        id: session.user.id,
        email: profile?.email ?? session.user.email ?? '',
        name: profile?.display_name || session.user.email || 'Fashion Floor user',
        avatar: profile?.avatar_url ?? undefined,
        role: roleRow.role,
        vendorId: roleRow.vendor_id,
      });
      setPermissions(checks.filter((permission): permission is Permission => permission !== null));
      return true;
    } catch (error) {
      clearData();
      setAuthError(errorText(error));
      return false;
    }
  }, [clearData]);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    setDataLoading(true);
    const errors: Partial<Record<QueryKey, string>> = {};
    const [orderResult, bookingResult, productResult, partnerResult, loungeLeadResult] = await Promise.all([
      permissions.includes('orders.view') ? supabase.from('admin_orders').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      permissions.includes('bookings.view') ? supabase.from('admin_bookings').select('*').order('starts_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
      permissions.includes('catalog.view') ? supabase.from('admin_products').select('*').order('title', { ascending: true }) : Promise.resolve({ data: [], error: null }),
      permissions.includes('partners.view') ? supabase.from('admin_partners').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      permissions.includes('partners.view') ? supabase.from('lounge_directory_leads').select('*').order('reference_code', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (orderResult.error) errors.orders = errorText(orderResult.error);
    if (bookingResult.error) errors.bookings = errorText(bookingResult.error);
    if (productResult.error) errors.products = errorText(productResult.error);
    if (partnerResult.error) errors.partners = errorText(partnerResult.error);
    if (loungeLeadResult.error) errors.loungeLeads = errorText(loungeLeadResult.error);
    setOrders(((orderResult.data ?? []) as any[]).map(mapOrder));
    setBookings(((bookingResult.data ?? []) as any[]).map(mapBooking));
    setProducts(((productResult.data ?? []) as any[]).map(mapProduct));
    setPartners(((partnerResult.data ?? []) as any[]).map(mapPartner));
    setLoungeLeads(((loungeLeadResult.data ?? []) as any[]).map(mapLoungeLead));
    setQueryErrors(errors);
    setDataLoading(false);
  }, [user, permissions]);

  useEffect(() => {
    const supabase = getSupabase();
    setConfigMissing(!hasSupabaseConfig());
    if (!supabase) {
      setReady(true);
      setAuthError('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in admin-panel/.env.local, then restart Next.js.');
      return;
    }
    let active = true;
    const handleAuth = (_event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;
      if (!session) {
        clearData();
        setAuthError(null);
        setReady(true);
        return;
      }
      window.setTimeout(() => {
        void loadIdentity(session).finally(() => active && setReady(true));
      }, 0);
    };
    const { data: listener } = supabase.auth.onAuthStateChange(handleAuth);
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(`Could not restore your sign-in: ${error.message}`);
      void loadIdentity(data.session).finally(() => active && setReady(true));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadIdentity]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, permissions, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, reason: 'Supabase is not configured. Add the public URL and publishable key to admin-panel/.env.local.' };
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const message = error.message.toLowerCase().includes('invalid login') ? 'Email or password is incorrect.' : error.message;
      setAuthError(message);
      return { ok: false, reason: message };
    }
    const authorized = await loadIdentity(data.session);
    if (!data.session) return { ok: false, reason: 'Sign-in did not return an active session.' };
    if (!authorized) return { ok: false, reason: 'Sign-in succeeded, but this account is not ready to use the admin panel. Review the access message below.' };
    return { ok: true };
  }, [loadIdentity]);

  const logout = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    clearData();
    setAuthError(null);
  }, [clearData]);

  const changePassword = useCallback(async (password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }, []);

  const setOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured.');
    if (status === 'paid' || status === 'pending') throw new Error('Payment status can only be updated by the payment provider.');
    const { error } = await supabase.rpc('update_order_status', { target_order_id: id, next_status: status });
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh]);

  const setBookingStatus = useCallback(async (id: string, status: BookingStatus) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.rpc('update_booking_status', { target_booking_id: id, next_status: status });
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh]);

  const value = useMemo<StoreValue>(() => ({
    ready, dataLoading, configMissing, authError, queryErrors, user, role: user?.role ?? null, permissions,
    orders, bookings, products, partners, loungeLeads, login, logout, changePassword, refresh, setOrderStatus, setBookingStatus,
  }), [ready, dataLoading, configMissing, authError, queryErrors, user, permissions, orders, bookings, products, partners, loungeLeads, login, logout, changePassword, refresh, setOrderStatus, setBookingStatus]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

export function useAccess() {
  const store = useStore();
  return {
    user: store.user,
    role: store.role,
    scope: store.role === 'supplier' || store.role === 'provider' ? 'own' : 'all',
    partnerId: store.user?.vendorId ?? undefined,
    can: (permission: Permission) => store.permissions.includes(permission),
    own: <T extends { vendorId: string }>(list: T[]) => store.role === 'supplier' || store.role === 'provider'
      ? list.filter((item) => item.vendorId === store.user?.vendorId)
      : list,
  };
}
