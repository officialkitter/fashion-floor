import React, { ReactNode, useCallback } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, radius, space, springs } from '../../theme/tokens';

export interface DualZoneSliderProps {
  labels: [string, string];
  left: ReactNode;
  right: ReactNode;
  initialIndex?: 0 | 1;
  onIndexChange?: (index: 0 | 1) => void;
}

const TOGGLE_PADDING = 4;

/**
 * Tactile two-zone toggle + carousel pager.
 * A single shared `progress` value (0 -> left, 1 -> right) drives the toggle thumb,
 * label colors and the page canvas, so everything stays in lockstep on the UI thread.
 */
export function DualZoneSlider({ labels, left, right, initialIndex = 0, onIndexChange }: DualZoneSliderProps) {
  const { width } = useWindowDimensions();
  const progress = useSharedValue<number>(initialIndex);
  const startProgress = useSharedValue(0);
  const index = useSharedValue<number>(initialIndex);

  const toggleWidth = width - space.xl * 2;
  const segmentWidth = (toggleWidth - TOGGLE_PADDING * 2) / 2;

  const notify = useCallback(
    (i: 0 | 1) => {
      Haptics.selectionAsync();
      onIndexChange?.(i);
    },
    [onIndexChange],
  );

  const goTo = useCallback(
    (i: 0 | 1) => {
      progress.value = withSpring(i, springs.page);
      if (index.value !== i) {
        index.value = i;
        notify(i);
      }
    },
    [progress, index, notify],
  );

  // Horizontal swipe anywhere on the canvas. Vertical movement fails the pan so lists keep scrolling.
  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      startProgress.value = progress.value;
    })
    .onUpdate((e) => {
      progress.value = Math.min(1, Math.max(0, startProgress.value - e.translationX / width));
    })
    .onEnd((e) => {
      const projected = progress.value - (e.velocityX / width) * 0.15;
      const target = projected > 0.5 ? 1 : 0;
      progress.value = withSpring(target, { ...springs.page, velocity: -e.velocityX / width });
      if (index.value !== target) {
        index.value = target;
        runOnJS(notify)(target as 0 | 1);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * segmentWidth }],
  }));
  const leftLabel = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.white, colors.slate]),
  }));
  const rightLabel = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.slate, colors.white]),
  }));
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * width }],
  }));

  return (
    <View style={styles.root}>
      <View style={[styles.toggle, { width: toggleWidth }]} accessibilityRole="tablist">
        <Animated.View style={[styles.thumb, { width: segmentWidth }, thumbStyle]} />
        <Pressable
          style={styles.segment}
          onPress={() => goTo(0)}
          accessibilityRole="tab"
          accessibilityLabel={labels[0]}
          accessibilityState={{ selected: initialIndex === 0 }}
        >
          <Animated.Text style={[styles.label, leftLabel]}>{labels[0]}</Animated.Text>
        </Pressable>
        <Pressable
          style={styles.segment}
          onPress={() => goTo(1)}
          accessibilityRole="tab"
          accessibilityLabel={labels[1]}
        >
          <Animated.Text style={[styles.label, rightLabel]}>{labels[1]}</Animated.Text>
        </Pressable>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.row, { width: width * 2 }, rowStyle]}>
            <View style={{ width }}>{left}</View>
            <View style={{ width }}>{right}</View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toggle: {
    alignSelf: 'center',
    marginTop: space.lg,
    marginBottom: space.md,
    height: 54,
    padding: TOGGLE_PADDING,
    borderRadius: radius.pill,
    backgroundColor: colors.offWhite,
    flexDirection: 'row',
  },
  thumb: {
    position: 'absolute',
    top: TOGGLE_PADDING,
    left: TOGGLE_PADDING,
    bottom: TOGGLE_PADDING,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    shadowColor: colors.black,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  viewport: { flex: 1, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
});
