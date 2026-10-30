import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Chip } from '../../shared/components/Chip';
import { ImageCarousel } from '../../shared/components/Slider';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { StatusPill } from '../../shared/components/StatusPill';
import { colors, radius, space, type } from '../../shared/theme/tokens';
import type { Product } from '../../shared/types/domain';
import { formatMoney } from '../../shared/utils/format';
import { useCartStore } from '../cart/cartStore';
import { BrandTagBadge } from './BrandTagBadge';

interface Props {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
}

const LOW_STOCK_AT = 2;

export function SizeSheet({ product, visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const addProduct = useCartStore((s) => s.addProduct);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      setSelectedSize(null);
      setSelectedColor(product?.colors?.[0] ?? null);
      setAdded(false);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [product?.id, visible]);

  const onAdd = () => {
    if (!product || !selectedSize || added) return;
    addProduct(product, selectedSize, selectedColor ?? undefined);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdded(true);
    timer.current = setTimeout(onClose, 550);
  };

  const carouselHeight = Math.min(width * 0.9, height * 0.34);
  const anyLow = product?.sizes.some((size) => size.stock > 0 && size.stock <= LOW_STOCK_AT) ?? false;
  const discount = product?.original_price_minor && product.original_price_minor > product.price_minor
    ? Math.round((1 - product.price_minor / product.original_price_minor) * 100)
    : null;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {product ? (
        <View style={styles.sheet}>
          <ScrollView
            style={[styles.scroll, { maxHeight: height * 0.68 }]}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <ImageCarousel
              images={product.images}
              width={width}
              height={carouselHeight}
              overlay={<BrandTagBadge brand_tag={product.brand_tag} />}
            />
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.brand}>{product.brand_tag.label}</Text>
                <Text style={styles.title}>{product.title}</Text>
                <Text style={styles.category}>{product.category ?? 'Fashion'}</Text>
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.price}>{formatMoney(product.price_minor, product.currency)}</Text>
                {discount && product.original_price_minor ? (
                  <Text style={styles.originalPrice}>{formatMoney(product.original_price_minor, product.currency)}</Text>
                ) : null}
                {discount ? <Text style={styles.discount}>{discount}% off</Text> : null}
              </View>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.rating}>★ {product.rating?.toFixed(1) ?? 'New'}</Text>
              <Text style={styles.muted}> {product.review_count ?? 0} product reviews</Text>
              <StatusPill status={product.status} />
            </View>
            {product.description ? <Text style={styles.description}>{product.description}</Text> : null}

            {product.colors?.length ? (
              <View style={styles.optionSection}>
                <Text style={styles.label}>COLOR{selectedColor ? ` · ${selectedColor}` : ''}</Text>
                <View style={styles.options}>
                  {product.colors.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[styles.option, selectedColor === color && styles.optionSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedColor === color }}
                      accessibilityLabel={`Color ${color}`}
                    >
                      <Text style={[styles.optionText, selectedColor === color && styles.optionTextSelected]}>{color}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.optionSection}>
              <Text style={styles.label}>SELECT SIZE</Text>
              <View style={styles.options}>
                {product.sizes.map(({ size, stock }) => (
                  <Chip
                    key={size}
                    label={size}
                    state={stock < 1 ? 'disabled' : selectedSize === size ? 'active' : 'default'}
                    dotColor={stock > 0 && stock <= LOW_STOCK_AT ? colors.warning : undefined}
                    accessibilityLabel={stock < 1 ? `Size ${size}, sold out` : `Select size ${size}`}
                    onPress={() => setSelectedSize(size)}
                  />
                ))}
              </View>
              {anyLow ? <Text style={styles.hint}>A highlighted size has limited sample stock.</Text> : null}
            </View>

            <View style={styles.sellerCard}>
              <Text style={styles.sellerLabel}>SOLD BY</Text>
              <Text style={styles.sellerName}>{product.seller_name ?? 'Fashion Floor partner'}</Text>
              <Text style={styles.sellerMeta}>
                ★ {product.seller_rating?.toFixed(1) ?? 'New'} · {product.seller_review_count ?? 0} store reviews · {product.units_sold ?? 0} sales
              </Text>
            </View>

            <View style={styles.details}>
              {([
                ['Category', product.category ?? 'Fashion'],
                ['Material', product.material ?? 'Not specified'],
                ['Fit', product.fit ?? 'See size guide'],
                ['Season', product.season ?? 'Year-round'],
                ['Care', product.care ?? 'Follow garment label'],
                ['Origin', product.origin ?? 'Not specified'],
                ['Delivery', product.shipping ?? 'Delivery estimate at checkout'],
                ['Returns', product.returns ?? 'See seller return policy'],
                ['Authenticity', product.authenticity ?? 'Confirm directly with the seller'],
              ] as const).map(([label, value]) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sampleNotice}>Marketplace preview listing. Availability, seller information, pricing, and authenticity must be confirmed before a real purchase.</Text>
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              label={added ? 'Added to bag' : selectedSize ? 'Add to bag' : 'Choose a size'}
              trailing={formatMoney(product.price_minor, product.currency)}
              disabled={!selectedSize || product.status === 'out_of_stock' || added}
              onPress={onAdd}
            />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { flexShrink: 1 },
  scroll: { flexGrow: 0 },
  body: { paddingBottom: space.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.lg },
  titleBlock: { flex: 1 },
  brand: { ...type.label, color: colors.terracotta, fontSize: 9 },
  title: { ...type.title, marginTop: 3 },
  category: { ...type.body, color: colors.slate, fontSize: 12, marginTop: 2 },
  priceBlock: { alignItems: 'flex-end' },
  price: { ...type.price, fontSize: 16, color: colors.black },
  originalPrice: { fontSize: 11, color: colors.slate, textDecorationLine: 'line-through', marginTop: 2 },
  discount: { fontSize: 10, color: colors.terracotta, fontWeight: '800', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, gap: 5, marginTop: space.md },
  rating: { color: colors.terracotta, fontSize: 12, fontWeight: '800' },
  muted: { ...type.body, color: colors.slate, fontSize: 11, flex: 1 },
  description: { ...type.body, color: colors.charcoal, fontSize: 13, lineHeight: 19, paddingHorizontal: space.xl, marginTop: space.md },
  optionSection: { paddingHorizontal: space.xl, marginTop: space.lg },
  label: { ...type.label, marginBottom: space.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: { borderWidth: 1, borderColor: colors.offWhite, borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 15 },
  optionSelected: { borderColor: colors.black, backgroundColor: colors.black },
  optionText: { color: colors.charcoal, fontSize: 12, fontWeight: '700' },
  optionTextSelected: { color: colors.white },
  hint: { ...type.body, color: colors.slate, fontSize: 11, marginTop: space.sm },
  sellerCard: { marginHorizontal: space.xl, marginTop: space.lg, padding: space.md, borderRadius: radius.md, backgroundColor: colors.offWhite },
  sellerLabel: { ...type.label, color: colors.slate, fontSize: 8 },
  sellerName: { ...type.title, fontSize: 15, marginTop: 3 },
  sellerMeta: { ...type.body, color: colors.slate, fontSize: 11, marginTop: 3 },
  details: { marginHorizontal: space.xl, marginTop: space.lg, borderTopWidth: 1, borderTopColor: colors.offWhite },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.offWhite },
  detailLabel: { ...type.body, color: colors.slate, fontSize: 11, width: 82 },
  detailValue: { ...type.body, color: colors.charcoal, fontSize: 11, flex: 1, textAlign: 'right' },
  sampleNotice: { ...type.body, color: colors.slate, fontSize: 10, lineHeight: 15, paddingHorizontal: space.xl, marginTop: space.md },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm, borderTopWidth: 1, borderTopColor: colors.offWhite },
});
