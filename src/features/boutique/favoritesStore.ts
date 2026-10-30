import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../../shared/storage/mmkv';

interface FavoritesState {
  productIds: string[];
  stylistIds: string[];
  toggle: (productId: string) => void;
  toggleStylist: (stylistId: string) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      productIds: [],
      stylistIds: [],
      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        })),
      toggleStylist: (stylistId) =>
        set((state) => ({
          stylistIds: state.stylistIds.includes(stylistId)
            ? state.stylistIds.filter((id) => id !== stylistId)
            : [...state.stylistIds, stylistId],
        })),
    }),
    {
      name: 'favorite-products',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ productIds: state.productIds, stylistIds: state.stylistIds }),
    },
  ),
);
