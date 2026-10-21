import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LaunchTransition } from './src/features/launch/LaunchTransition';
import { HomeScreen } from './src/screens/HomeScreen';
import { colors } from './src/shared/theme/tokens';

// The native splash is plain black, so it hands off seamlessly to the animated launch.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
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
