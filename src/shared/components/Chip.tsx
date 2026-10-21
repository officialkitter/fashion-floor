import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { colors, radius } from '../theme/tokens';

export type ChipState = 'default' | 'active' | 'disabled';

interface Props {
  label: string;
  state: ChipState;
  onPress?: () => void;
  /** Fill when active. Defaults to Mint Green (success / active booking). */
  activeColor?: string;
  activeTextColor?: string;
  /** Small status dot, e.g. amber for low stock or a held slot. */
  dotColor?: string;
  accessibilityLabel?: string;
}

/** Selectable pill used for sizes and salon time-slots. Fill cross-fades on the UI thread. */
export function Chip({
  label,
  state,
  onPress,
  activeColor = colors.success,
  activeTextColor = colors.black,
  dotColor,
  accessibilityLabel,
}: Props) {
  const progress = useSharedValue(state === 'active' ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(state === 'active' ? 1 : 0, { duration: 180 });
  }, [state, progress]);

  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.offWhite, activeColor]),
  }));
  const txt = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.black, activeTextColor]),
  }));

  const disabled = state === 'disabled';

  return (
    <PressableScale
      disabled={disabled || !onPress}
      onPress={onPress}
      pressedScale={0.94}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected: state === 'active' }}
      style={disabled ? styles.disabled : undefined}
    >
      <Animated.View style={[styles.chip, bg]}>
        {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
        <Animated.Text style={[styles.label, txt, disabled && styles.strike]}>{label}</Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 64,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4 },
  disabled: { opacity: 0.4 },
  strike: { textDecorationLine: 'line-through' },
});
