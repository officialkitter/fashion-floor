import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '../api/client';
import { mmkvStorage } from '../storage/mmkv';

export interface ResourceState<T> {
  items: T[];
  /** `loading` = nothing cached yet (show skeletons); `refreshing` = stale-while-revalidate. */
  status: 'idle' | 'loading' | 'refreshing' | 'error';
  error?: string;
  fetchedAt: number | null;
  load: (opts?: { force?: boolean }) => Promise<void>;
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
            const data = await api.get<T[]>(path);
            set({ items: data, status: 'idle', fetchedAt: Date.now() });
          } catch (e) {
            set({ status: 'error', error: e instanceof Error ? e.message : 'Something went wrong' });
          }
        },
      }),
      {
        name,
        storage: createJSONStorage(() => mmkvStorage),
        partialize: (s) => ({ items: s.items, fetchedAt: s.fetchedAt }),
      },
    ),
  );
}
