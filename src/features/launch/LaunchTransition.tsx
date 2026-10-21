import React, { ReactNode, useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, springs } from '../../shared/theme/tokens';

const HEADER_CONTENT = 56;
const LOGO_HEIGHT = 28;
const BLEED = 56; // extra sheet height so spring overshoot never exposes black at the bottom

interface Props {
  children: ReactNode;
  onSettled?: () => void;
}

/**
 * Signature launch: white logo centered on black -> scales down and floats up to become the
 * persistent header, while the white canvas sweeps in from the bottom on a spring.
 * `children` mount immediately underneath so data fetching starts during the animation.
 */
export function LaunchTransition({ children, onSettled }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const headerHeight = insets.top + HEADER_CONTENT;
  const logoStartCenter = height / 2;
  const logoEndCenter = insets.top + HEADER_CONTENT / 2;

  const logo = useSharedValue(0);
  const sheet = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      logo.value = 1;
      sheet.value = 1;
      onSettled?.();
      return;
    }
    logo.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    );
    sheet.value = withDelay(
      650,
      withSpring(1, springs.sweep, (done) => {
        if (done && onSettled) runOnJS(onSettled)();
      }),
    );
    // Runs once on launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(logo.value, [0, 1], [0, logoEndCenter - logoStartCenter]) },
      { scale: interpolate(logo.value, [0, 1], [1.9, 1]) },
    ],
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sheet.value, [0, 1], [height - headerHeight, 0]) }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.sheet, { top: headerHeight, bottom: -BLEED, paddingBottom: BLEED }, sheetStyle]}
      >
        {children}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.logoWrap, { top: logoStartCenter - LOGO_HEIGHT / 2 }, logoStyle]}
      >
        <Text style={styles.logo} accessibilityRole="header">
          FASHION FLOOR
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  logoWrap: { position: 'absolute', left: 0, right: 0, height: LOGO_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  logo: { color: colors.white, fontSize: 15, lineHeight: LOGO_HEIGHT, fontWeight: '800', letterSpacing: 4 },
});
