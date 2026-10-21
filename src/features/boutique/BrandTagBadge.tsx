import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../shared/theme/tokens';
import type { BrandTag } from '../../shared/types/domain';

/** Custom `brand_tag` overlay on product imagery. */
export function BrandTagBadge({ brand_tag }: { brand_tag: BrandTag }) {
  const dark = brand_tag.tone === 'dark';
  return (
    <View style={[styles.badge, { backgroundColor: dark ? colors.black : colors.white }]}>
      <Text style={[styles.text, { color: dark ? colors.white : colors.black }]} numberOfLines={1}>
        {brand_tag.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    maxWidth: '80%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
});
