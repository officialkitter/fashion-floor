import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api, RESOURCE_PAGE_SIZE } from '../api/client';
import { mmkvStorage } from '../storage/mmkv';

export interface ResourceState<T> {
  items: T[];
  hasMore: boolean;
  /** `loading` = nothing cached yet (show skeletons); `refreshing` = stale-while-revalidate. */
  status: 'idle' | 'loading' | 'refreshing' | 'error';
  error?: string;
  fetchedAt: number | null;
  load: (opts?: { force?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Offline-first list store: hydrates instantly from MMKV, then revalidates
 * against the Fastify API when the cache is older than `ttlMs`.
 */
export function createCachedResource<T>(name: string, path: string, ttlMs = 5 * 60_000) {
  return create<ResourceState<T>>()(
    persist(
      (set, get) => ({
        items: [],
        hasMore: true,
        status: 'idle',
        error: undefined,
        fetchedAt: null,
        load: async (opts) => {
          const { items, fetchedAt, status } = get();
          if (status === 'loading' || status === 'refreshing') return;
          const fresh = fetchedAt !== null && Date.now() - fetchedAt < ttlMs;
          if (fresh && !opts?.force) return;

          set({ status: items.length ? 'refreshing' : 'loading', error: undefined });
          try {
            const data = await api.get<T[]>(path, 0);
            set({
              items: data,
              hasMore: data.length === RESOURCE_PAGE_SIZE,
              status: 'idle',
              fetchedAt: Date.now(),
            });
          } catch (e) {
            set({ status: 'error', error: e instanceof Error ? e.message : 'Something went wrong' });
          }
        },
        loadMore: async () => {
          const { items, hasMore, status } = get();
          if (!hasMore || status === 'loading' || status === 'refreshing' || status === 'error') return;
          if (!items.length) return get().load();

          set({ status: 'refreshing', error: undefined });
          try {
            const data = await api.get<T[]>(path, items.length);
            set((state) => ({
              items: [...state.items, ...data],
              hasMore: data.length === RESOURCE_PAGE_SIZE,
              status: 'idle',
              fetchedAt: Date.now(),
            }));
          } catch (e) {
            set({
              status: 'error',
              error: e instanceof Error ? e.message : 'Something went wrong',
            });
          }
        },
      }),
      {
        name,
        storage: createJSONStorage(() => mmkvStorage),
        partialize: (s) => ({ items: s.items, hasMore: s.hasMore, fetchedAt: s.fetchedAt }),
      },
    ),
  );
}
