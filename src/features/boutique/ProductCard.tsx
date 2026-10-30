import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { PressableScale } from '../../shared/components/PressableScale';
import { StatusPill } from '../../shared/components/StatusPill';
import { Skeleton } from '../../shared/components/Skeleton';
import { colors, radius, type } from '../../shared/theme/tokens';
import type { Product } from '../../shared/types/domain';
import { formatMoney } from '../../shared/utils/format';
import { BrandTagBadge } from './BrandTagBadge';
import { useFavoritesStore } from './favoritesStore';

interface Props {
  product: Product;
  width: number;
  onPress: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ product, width, onPress }: Props) {
  const soldOut = product.status === 'out_of_stock';
  const price = formatMoney(product.price_minor, product.currency);
  const discount = product.original_price_minor && product.original_price_minor > product.price_minor
    ? Math.round((1 - product.price_minor / product.original_price_minor) * 100)
    : null;
  const favorite = useFavoritesStore((state) => state.productIds.includes(product.id));
  const toggleFavorite = useFavoritesStore((state) => state.toggle);

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
        {discount ? <View style={styles.discountBadge}><Text style={styles.discountText}>{discount}% OFF</Text></View> : null}
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            toggleFavorite(product.id);
          }}
          style={styles.favorite}
          accessibilityRole="button"
          accessibilityLabel={favorite ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          hitSlop={8}
        >
          <Text style={[styles.favoriteIcon, favorite && styles.favoriteActive]}>{favorite ? '♥' : '♡'}</Text>
        </Pressable>
        {product.status !== 'in_stock' ? (
          <View style={styles.status}>
            <StatusPill status={product.status} />
          </View>
        ) : null}
      </View>
      <Text style={styles.brand} numberOfLines={1}>{product.brand_tag.label}</Text>
      <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
      <Text style={styles.meta} numberOfLines={1}>{product.category ?? 'Fashion'} · {product.seller_name ?? 'Partner store'}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{price}</Text>
        {discount && product.original_price_minor ? (
          <Text style={styles.originalPrice}>{formatMoney(product.original_price_minor, product.currency)}</Text>
        ) : null}
      </View>
      <Text style={styles.rating}>★ {product.rating?.toFixed(1) ?? 'New'} <Text style={styles.ratingCount}>({product.review_count ?? 0})</Text></Text>
    </PressableScale>
  );
});

export function ProductCardSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width }}>
      <Skeleton width={width} height={width * 1.3} radius={radius.md} />
      <Skeleton width={width * 0.7} height={14} style={{ marginTop: 10 }} />
      <Skeleton width={width * 0.45} height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.offWhite },
  favorite: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,252,248,0.9)' },
  favoriteIcon: { color: colors.black, fontSize: 20, lineHeight: 24 },
  favoriteActive: { color: colors.terracotta },
  status: { position: 'absolute', left: 10, bottom: 10 },
  discountBadge: { position: 'absolute', left: 10, top: 42, borderRadius: radius.pill, backgroundColor: colors.terracotta, paddingVertical: 5, paddingHorizontal: 8 },
  discountText: { color: colors.white, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  brand: { ...type.label, color: colors.terracotta, fontSize: 8, marginTop: 9 },
  title: { ...type.body, fontWeight: '600', color: colors.black, marginTop: 10 },
  meta: { ...type.body, color: colors.slate, fontSize: 9, marginTop: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  price: { ...type.price, fontSize: 13 },
  originalPrice: { fontSize: 10, color: colors.slate, textDecorationLine: 'line-through' },
  rating: { color: colors.terracotta, fontSize: 10, fontWeight: '800', marginTop: 3 },
  ratingCount: { color: colors.slate, fontWeight: '500' },
});
