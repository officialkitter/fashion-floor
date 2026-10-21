import React, { ReactNode } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<string>);

interface Props {
  images: string[];
  width: number;
  height?: number;
  /** Absolutely-positioned content over the image, e.g. a brand tag. */
  overlay?: ReactNode;
}

interface DotProps {
  index: number;
  width: number;
  scrollX: SharedValue<number>;
}

/** The active dot stretches into an oval pill as the page approaches, then relaxes. */
function Dot({ index, width, scrollX }: DotProps) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      width: interpolate(scrollX.value, input, [8, 26, 8], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(scrollX.value, input, [colors.slate, colors.black, colors.slate]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export function ImageCarousel({ images, width, height = width * 1.2, overlay }: Props) {
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  return (
    <View style={{ width }}>
      <View style={{ width, height }}>
        <AnimatedFlatList
          data={images}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width, height }} contentFit="cover" transition={200} />
          )}
        />
        {overlay}
      </View>
      {images.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {images.map((_, i) => (
            <Dot key={i} index={i} width={width} scrollX={scrollX} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 14 },
  dot: { height: 8, borderRadius: 4 },
});
