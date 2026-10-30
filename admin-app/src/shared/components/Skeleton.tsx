import React, { useEffect, useState } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { radius as r } from '../theme/tokens';

interface Props {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shimmer sweeping light grey -> dark grey -> light grey. Runs on the UI thread. */
export function Skeleton({ width = '100%', height = 16, radius = r.sm, style }: Props) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(x);
  }, [x]);

  const band = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [0, 1], [-w, w]) }],
  }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: radius, backgroundColor: '#E5E5EA', overflow: 'hidden' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, band]}>
          <LinearGradient
            colors={['#E5E5EA', '#A9A9B0', '#E5E5EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
