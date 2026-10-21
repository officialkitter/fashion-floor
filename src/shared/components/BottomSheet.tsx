import React, { ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, springs } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom drawer: spring-in, drag-to-dismiss, backdrop fade.
 * Rendered in a Modal so it covers the whole screen even when opened from inside the swipe pager.
 */
export function BottomSheet({ visible, onClose, children }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = withSpring(0, springs.sheet);
      backdrop.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 180 });
      y.value = withTiming(height, { duration: 240 }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const drag = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        runOnJS(onClose)();
      } else {
        y.value = withSpring(0, springs.sheet);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.5 }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, sheetStyle]}>
          <GestureDetector gesture={drag}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.black },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  handleArea: { position: 'absolute', top: 0, left: 0, right: 0, height: 28, zIndex: 2, alignItems: 'center', paddingTop: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)' },
});
