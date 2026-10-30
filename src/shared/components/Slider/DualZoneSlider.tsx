import React, { ReactNode, useCallback, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolate,
  interpolateColor,
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
  activeColor?: string;
  trackColor?: string;
}

const TOGGLE_PADDING = 4;

/**
 * Tactile two-zone toggle + carousel pager.
 * A single shared `progress` value (0 -> left, 1 -> right) drives the toggle thumb,
 * label colors and the page canvas, so everything stays in lockstep on the UI thread.
 */
export function DualZoneSlider({
  labels,
  left,
  right,
  initialIndex = 0,
  onIndexChange,
  activeColor = colors.black,
  trackColor = colors.offWhite,
}: DualZoneSliderProps) {
  const { width } = useWindowDimensions();
  const progress = useSharedValue<number>(initialIndex);
  const index = useSharedValue<number>(initialIndex);
  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);

  const toggleWidth = width - space.xl * 2;
  const availableWidth = toggleWidth - TOGGLE_PADDING * 2;

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
        setSelectedIndex(i);
        notify(i);
      }
    },
    [progress, index, notify],
  );

  const thumbStyle = useAnimatedStyle(() => {
    const activeWidth = interpolate(progress.value, [0, 1], [availableWidth * 0.6, availableWidth * 0.6]);
    return {
      width: activeWidth,
      transform: [{ translateX: progress.value * (availableWidth - activeWidth) }],
    };
  });
  const leftSegmentStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [availableWidth * 0.6, availableWidth * 0.4]),
  }));
  const rightSegmentStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [availableWidth * 0.4, availableWidth * 0.6]),
  }));
  const leftLabel = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.white, colors.slate]),
    fontSize: interpolate(progress.value, [0, 1], [12, 10]),
  }));
  const rightLabel = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.slate, colors.white]),
    fontSize: interpolate(progress.value, [0, 1], [10, 12]),
  }));
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * width }],
  }));

  return (
    <View style={styles.root}>
      <View style={[styles.toggle, { width: toggleWidth, backgroundColor: trackColor }]} accessibilityRole="tablist">
        <Animated.View style={[styles.thumb, { backgroundColor: activeColor }, thumbStyle]} />
        <Animated.View style={[styles.segment, leftSegmentStyle]}>
          <Pressable
            style={styles.segmentHit}
            onPress={() => goTo(0)}
            accessibilityRole="tab"
            accessibilityLabel={labels[0]}
            accessibilityState={{ selected: selectedIndex === 0 }}
          >
            <Animated.Text style={[styles.label, leftLabel]}>{labels[0]}</Animated.Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={[styles.segment, rightSegmentStyle]}>
          <Pressable
            style={styles.segmentHit}
            onPress={() => goTo(1)}
            accessibilityRole="tab"
            accessibilityLabel={labels[1]}
            accessibilityState={{ selected: selectedIndex === 1 }}
          >
            <Animated.Text style={[styles.label, rightLabel]}>{labels[1]}</Animated.Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.viewport}>
        <Animated.View style={[styles.row, { width: width * 2 }, rowStyle]}>
          {selectedIndex === 0 ? (
            <View style={{ width }}>{left}</View>
          ) : (
            <>
              <View style={{ width }} />
              <View style={{ width }}>{right}</View>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toggle: {
    alignSelf: 'center',
    marginTop: space.lg,
    marginBottom: space.md,
    height: 62,
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
  segment: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  segmentHit: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  viewport: { flex: 1, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
});
