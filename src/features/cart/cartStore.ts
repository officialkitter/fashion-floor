import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../../shared/storage/mmkv';
import type { CartItem, Product, SalonCartItem, Stylist, TimeSlot } from '../../shared/types/domain';

interface CartState {
  items: CartItem[];
  addProduct: (product: Product, size: string, color?: string) => void;
  /** Tap once to reserve a slot, tap again to release. One slot per stylist. */
  toggleSlot: (stylist: Stylist, slot: TimeSlot, buildingName?: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addProduct: (product, size, color) =>
        set((state) => {
          const id = `p:${product.id}:${size}:${color ?? ''}`;
          const stock = product.sizes.find((s) => s.size === size)?.stock ?? 0;
          const existing = state.items.find((i) => i.id === id);

          if (existing) {
            if (existing.quantity >= stock) return state;
            return {
              items: state.items.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)),
            };
          }
          if (stock < 1) return state;

          return {
            items: [
              ...state.items,
              {
                kind: 'product',
                id,
                vendor_id: product.vendor_id,
                product_id: product.id,
                title: product.title,
                subtitle: `Size ${size}${color ? ` · ${color}` : ''}`,
                size,
                color,
                image_url: product.images[0] ?? '',
                brand_tag: product.brand_tag,
                unit_price_minor: product.price_minor,
                currency: product.currency,
                quantity: 1,
                status: 'pending',
                added_at: Date.now(),
              },
            ],
          };
        }),

      toggleSlot: (stylist, slot, buildingName) =>
        set((state) => {
          const id = `s:${slot.id}`;
          if (state.items.some((i) => i.id === id)) {
            return { items: state.items.filter((i) => i.id !== id) };
          }
          const next: SalonCartItem = {
            kind: 'salon',
            id,
            vendor_id: stylist.vendor_id,
            stylist_id: stylist.id,
            building_name: buildingName,
            slot_id: slot.id,
            title: stylist.name,
            subtitle: `${stylist.role} · ${slot.duration_min} min`,
            starts_at: slot.starts_at,
            duration_min: slot.duration_min,
            unit_price_minor: slot.price_minor,
            currency: slot.currency,
            quantity: 1,
            status: 'pending',
            added_at: Date.now(),
          };
          return {
            items: [
              ...state.items.filter((i) => !(i.kind === 'salon' && i.stylist_id === stylist.id)),
              next,
            ],
          };
        }),

      remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'cart-tzs-v2',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export const selectCount = (s: { items: CartItem[] }) => s.items.reduce((n, i) => n + i.quantity, 0);

export const selectSubtotal = (s: { items: CartItem[] }) =>
  s.items.reduce((sum, i) => sum + i.unit_price_minor * i.quantity, 0);

/** Assumes a single storefront currency; take it from the first line. */
export const selectCurrency = (s: { items: CartItem[] }) => s.items[0]?.currency ?? 'TZS';

export const selectHasSlot = (slotId: string) => (s: { items: CartItem[] }) =>
  s.items.some((i) => i.kind === 'salon' && i.slot_id === slotId);
