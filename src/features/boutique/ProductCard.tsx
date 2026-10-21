import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { PressableScale } from '../../shared/components/PressableScale';
import { StatusPill } from '../../shared/components/StatusPill';
import { Skeleton } from '../../shared/components/Skeleton';
import { colors, radius, type } from '../../shared/theme/tokens';
import type { Product } from '../../shared/types/domain';
import { formatMoney } from '../../shared/utils/format';
import { BrandTagBadge } from './BrandTagBadge';

interface Props {
  product: Product;
  width: number;
  onPress: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ product, width, onPress }: Props) {
  const soldOut = product.status === 'out_of_stock';
  const price = formatMoney(product.price_minor, product.currency);

  return (
    <PressableScale
      onPress={() => onPress(product)}
      pressedScale={0.97}
      style={{ width }}
      accessibilityRole="button"
      accessibilityLabel={`${product.title}, ${price}${soldOut ? ', sold out' : ''}`}
    >
      <View style={[styles.imageWrap, { width, height: width * 1.3 }]}>
        <Image
          source={{ uri: product.images[0] }}
          style={[StyleSheet.absoluteFill, soldOut && { opacity: 0.45 }]}
          contentFit="cover"
          transition={200}
        />
        <BrandTagBadge brand_tag={product.brand_tag} />
        {product.status !== 'in_stock' ? (
          <View style={styles.status}>
            <StatusPill status={product.status} />
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {product.title}
      </Text>
      <Text style={styles.price}>{price}</Text>
    </PressableScale>
  );
});

export function ProductCardSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width }}>
      <Skeleton width={width} height={width * 1.3} radius={radius.md} />
      <Skeleton width={width * 0.7} height={14} style={{ marginTop: 10 }} />
      <Skeleton width={width * 0.35} height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.offWhite },
  status: { position: 'absolute', left: 10, bottom: 10 },
  title: { ...type.body, fontWeight: '600', color: colors.black, marginTop: 10 },
  price: { ...type.price, marginTop: 2 },
});
