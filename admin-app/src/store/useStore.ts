import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Booking, Member, Order, Partner, Product } from '../lib/data';
import { fetchAdminData, profileFrom, roleFrom } from '../lib/backend';
import type { Permission } from '../lib/rbac';
import { ROLE_META, ROLE_PERMISSIONS } from '../lib/rbac';
import { liveModeError, supabase } from '../lib/supabase';

export interface ToastMsg {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

interface State {
  userId: string | null;
  user: Member | null;
  role: Member['role'] | null;
  authReady: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  orders: Order[];
  bookings: Booking[];
  products: Product[];
  partners: Partner[];
  toast: ToastMsg | null;
  start: () => () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refresh: () => Promise<boolean>;
  setOrderStatus: (id: string, status: string) => Promise<boolean>;
  setBookingStatus: (id: string, status: string) => Promise<boolean>;
  notify: (text: string, tone?: ToastMsg['tone']) => void;
}

let authUnsubscribe: (() => void) | null = null;
let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

const errorText = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message);
    const details = 'details' in error ? String(error.details ?? '') : '';
    return details ? `${message} ${details}` : message;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
};

async function callStatusRpc(functionName: 'update_order_status' | 'update_booking_status', id: string, status: string) {
  if (!supabase) return new Error('Supabase is not configured for live mode.');
  const args = functionName === 'update_order_status'
    ? { target_order_id: id, next_status: status }
    : { target_booking_id: id, next_status: status };
  const { error } = await supabase.rpc(functionName, args);
  return error;
}

async function loadAccount(userId: string, email?: string) {
  if (!supabase) return;
  const [profileResult, roleResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (roleResult.error) throw roleResult.error;
  const roleRow = roleResult.data as Record<string, unknown> | null;
  const role = roleFrom(roleRow?.role);
  if (!role) throw new Error('Your account does not have a supported Fashion Floor role. Contact an administrator.');
  const profile = profileFrom((profileResult.data ?? {}) as Record<string, unknown>, { id: userId, email });
  const user: Member = {
    ...profile,
    role,
    partnerId: roleRow?.vendor_id ? String(roleRow.vendor_id) : undefined,
  };
  useStore.setState({ userId, user, role, error: null });
}

export const useStore = create<State>((set, get) => ({
  userId: null,
  user: null,
  role: null,
  authReady: false,
  loading: false,
  refreshing: false,
  error: liveModeError,
  orders: [],
  bookings: [],
  products: [],
  partners: [],
  toast: null,

  start: () => {
    if (!supabase) {
      set({ authReady: true, error: liveModeError });
      return () => {};
    }
    const client = supabase;
    if (authUnsubscribe) return authUnsubscribe;
    const handleSession = async (session: Session | null) => {
      if (!session) {
        set({ userId: null, user: null, role: null, loading: false, refreshing: false, error: null, orders: [], bookings: [], products: [], partners: [] });
        if (channel) {
          await client.removeChannel(channel);
          channel = null;
        }
        return;
      }
      set({ loading: true, error: null });
      try {
        await loadAccount(session.user.id, session.user.email);
        const ok = await get().refresh();
        if (ok && !channel) {
          channel = client
            .channel('fashion-floor-admin-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void get().refresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => void get().refresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => void get().refresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => void get().refresh())
            .subscribe();
        }
      } catch (error) {
        set({ userId: session.user.id, user: null, role: null, error: errorText(error) });
      } finally {
        set({ loading: false });
      }
    };
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') void handleSession(session);
    });
    authUnsubscribe = () => {
      data.subscription.unsubscribe();
      authUnsubscribe = null;
    };
    void client.auth.getSession().then(({ data: sessionData, error }) => {
      if (error) set({ error: errorText(error) });
      void handleSession(sessionData.session);
    }).catch((error: unknown) => set({ error: errorText(error) }));
    set({ authReady: true });
    return authUnsubscribe;
  },

  signIn: async (email, password) => {
    if (!supabase) {
      set({ error: liveModeError });
      return false;
    }
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        set({ loading: false, error: errorText(error) });
        return false;
      }
    } catch (error) {
      set({ loading: false, error: errorText(error) });
      return false;
    }
    set({ loading: false });
    return true;
  },

  signOut: async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) set({ error: errorText(error) });
    } catch (error) {
      set({ error: errorText(error) });
    }
  },

  refresh: async () => {
    if (!supabase) {
      set({ error: liveModeError });
      return false;
    }
    set({ refreshing: true, error: null });
    try {
      const data = await fetchAdminData();
      set({ ...data, refreshing: false });
      return true;
    } catch (error) {
      const message = errorText(error);
      set({ refreshing: false, error: message });
      get().notify(`Unable to load live data: ${message}`, 'bad');
      return false;
    }
  },

  setOrderStatus: async (id, status) => {
    if (!supabase) return false;
    try {
      const error = await callStatusRpc('update_order_status', id, status);
      if (error) {
        get().notify(`Order update failed: ${errorText(error)}`, 'bad');
        return false;
      }
      const refreshed = await get().refresh();
      if (refreshed) get().notify('Order status updated.');
      return refreshed;
    } catch (error) {
      get().notify(`Order update failed: ${errorText(error)}`, 'bad');
      return false;
    }
  },

  setBookingStatus: async (id, status) => {
    if (!supabase) return false;
    try {
      const error = await callStatusRpc('update_booking_status', id, status);
      if (error) {
        get().notify(`Appointment update failed: ${errorText(error)}`, 'bad');
        return false;
      }
      const refreshed = await get().refresh();
      if (refreshed) get().notify('Appointment status updated.');
      return refreshed;
    } catch (error) {
      get().notify(`Appointment update failed: ${errorText(error)}`, 'bad');
      return false;
    }
  },

  notify: (text, tone = 'good') => {
    const id = Date.now();
    set({ toast: { id, text, tone } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 4200);
  },
}));

export function useAccess() {
  const user = useStore((s) => s.user);
  const role = useStore((s) => s.role);
  const scope = role ? ROLE_META[role].scope : 'all';
  const partnerId = user?.partnerId;
  const can = (permission: Permission) => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
  };
  const own = <T extends { partnerId: string }>(records: T[]) =>
    scope === 'own' ? records.filter((record) => record.partnerId === partnerId) : records;
  return { user, role, scope, partnerId, can, own };
}
