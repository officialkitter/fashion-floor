import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutDown, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { useStore } from '../../store/useStore';

/** Confirmation pill shown after every action so nobody wonders "did that work?". */
export function ToastHost() {
  const toast = useStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  if (!toast) return null;
  const dot = toast.tone === 'good' ? colors.success : toast.tone === 'bad' ? colors.danger : colors.slate;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 96 }]}>
      <Animated.View
        key={toast.id}
        entering={reducedMotion ? undefined : SlideInDown.springify().damping(16)}
        exiting={reducedMotion ? undefined : FadeOutDown.duration(180)}
        style={styles.toast}
        accessibilityRole="alert"
      >
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={styles.text}>{toast.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.black, paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.pill },
  dot: { width: 9, height: 9, borderRadius: 5 },
  text: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
