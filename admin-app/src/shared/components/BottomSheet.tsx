import React, { ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, springs } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Spring-in drawer with drag-to-dismiss. Content scrolls if it is taller than the sheet. */
export function BottomSheet({ visible, onClose, children }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = reducedMotion ? 0 : withSpring(0, springs.sheet);
      backdrop.value = reducedMotion ? 1 : withTiming(1, { duration: 220 });
    } else if (mounted) {
      if (reducedMotion) {
        backdrop.value = 0;
        y.value = height;
        setMounted(false);
      } else {
        backdrop.value = withTiming(0, { duration: 180 });
        y.value = withTiming(height, { duration: 240 }, (done) => {
          if (done) runOnJS(setMounted)(false);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reducedMotion]);

  const drag = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) runOnJS(onClose)();
      else y.value = reducedMotion ? 0 : withSpring(0, springs.sheet);
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.5 }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} pointerEvents="box-none">
          <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }, sheetStyle]}>
            <GestureDetector gesture={drag}>
              <View style={styles.handleArea}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.black },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  handleArea: { height: 28, alignItems: 'center', paddingTop: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#D1D1D6' },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 12, gap: 16 },
});
