import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkv';

type Language = 'en' | 'sw';

interface AppSettingsState {
  language: Language;
  notificationsEnabled: boolean;
  profileName: string;
  profileImageUri: string | null;
  locationLabel: string;
  setLanguage: (language: Language) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setProfileName: (profileName: string) => void;
  setProfileImageUri: (profileImageUri: string | null) => void;
  setLocationLabel: (locationLabel: string) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      notificationsEnabled: true,
      profileName: 'Guest',
      profileImageUri: null,
      locationLabel: 'Set your location',
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setProfileName: (profileName) => set({ profileName }),
      setProfileImageUri: (profileImageUri) => set({ profileImageUri }),
      setLocationLabel: (locationLabel) => set({ locationLabel }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        language: state.language,
        notificationsEnabled: state.notificationsEnabled,
        profileName: state.profileName,
        profileImageUri: state.profileImageUri,
        locationLabel: state.locationLabel,
      }),
    },
  ),
);
