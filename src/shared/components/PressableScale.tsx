import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  /** Scale while pressed. Primary CTAs use 0.96. */
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Tactile press feedback driven entirely on the UI thread. */
export function PressableScale({
  pressedScale = 0.96,
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(pressedScale, springs.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, springs.press);
        onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
