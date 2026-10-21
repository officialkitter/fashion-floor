import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const storage = new MMKV({ id: 'fashion-floor' });

/** Synchronous MMKV adapter for zustand `persist`: instant, offline-first hydration. */
export const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.delete(name),
};
