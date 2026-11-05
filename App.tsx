import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useBoutiqueStore } from './src/features/boutique/boutiqueStore';
import { useBuildingStore } from './src/features/lounge/buildingStore';
import { useLoungeStore } from './src/features/lounge/loungeStore';
import { LaunchTransition } from './src/features/launch/LaunchTransition';
import { HomeScreen } from './src/screens/HomeScreen';
import { colors } from './src/shared/theme/tokens';

// The native splash is plain black, so it hands off seamlessly to the animated launch.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    let active = true;
    const startupData = Promise.all([
      useBoutiqueStore.getState().load(),
      useLoungeStore.getState().load(),
      useBuildingStore.getState().load(),
      Image.prefetch(
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=70',
        'memory-disk',
      ).catch((error) => {
        console.warn('Could not warm the welcome image cache.', error);
      }),
    ]);
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    const startupLimit = new Promise<void>((resolve) => {
      startupTimer = setTimeout(resolve, 900);
    });

    void Promise.race([startupData, startupLimit]).finally(() => {
      if (startupTimer) clearTimeout(startupTimer);
      if (active) {
        SplashScreen.hideAsync().catch((error) => {
          console.warn('Could not hide the native splash screen.', error);
        });
      }
    });

    return () => {
      active = false;
      if (startupTimer) clearTimeout(startupTimer);
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LaunchTransition>
          <HomeScreen />
        </LaunchTransition>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
});
