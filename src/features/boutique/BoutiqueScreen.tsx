import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { colors, radius, space, type } from '../../shared/theme/tokens';
import type { Product } from '../../shared/types/domain';
import { useBoutiqueStore } from './boutiqueStore';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { SizeSheet } from './SizeSheet';

const GAP = space.md;
const SKELETONS = [0, 1, 2, 3];

export function BoutiqueScreen() {
  const { width } = useWindowDimensions();
  const cardWidth = (width - space.xl * 2 - GAP) / 2;

  const items = useBoutiqueStore((s) => s.items);
  const status = useBoutiqueStore((s) => s.status);
  const error = useBoutiqueStore((s) => s.error);
  const load = useBoutiqueStore((s) => s.load);

  // `selected` outlives `open` so the product stays rendered during the close animation.
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const onSelect = useCallback((p: Product) => {
    setSelected(p);
    setOpen(true);
  }, []);

  const showSkeleton = status === 'loading' && items.length === 0;
  const showError = status === 'error' && items.length === 0;

  const header = (
    <Animated.View entering={FadeInDown.duration(650).springify()} style={styles.header}>
      <LinearGradient colors={[colors.black, '#514239']} style={styles.hero}>
        <Text style={styles.kicker}>THE BOUTIQUE · EDIT 01</Text>
        <Text style={styles.display}>Dress for{"\n"}your next.</Text>
        <Text style={styles.heroSub}>Thoughtful pieces. A wardrobe that feels like you.</Text>
        <View style={styles.heroMark}>
          <Text style={styles.heroMarkText}>FF</Text>
        </View>
      </LinearGradient>
      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>Just arrived</Text>
          <Text style={styles.sub}>Tap a piece to find your fit.</Text>
        </View>
        {items.length > 0 ? <Text style={styles.count}>{String(items.length).padStart(2, '0')} PIECES</Text> : null}
      </View>
    </Animated.View>
  );

  if (showSkeleton) {
    return (
      <View style={styles.skeletonWrap}>
        {header}
        <View style={styles.skeletonGrid}>
          {SKELETONS.map((i) => (
            <ProductCardSkeleton key={i} width={cardWidth} />
          ))}
        </View>
      </View>
    );
  }

  if (showError) {
    return (
      <View style={styles.errorWrap}>
        {header}
        <Text style={styles.errorText}>{error ?? 'Could not load the boutique.'}</Text>
        <PrimaryButton label="Try again" onPress={() => load({ force: true })} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={status === 'refreshing'}
            onRefresh={() => load({ force: true })}
            tintColor={colors.black}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 75).springify()} style={{ width: cardWidth }}>
            <ProductCard product={item} width={cardWidth} onPress={onSelect} />
          </Animated.View>
        )}
      />
      <SizeSheet product={selected} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.xl },
  hero: { minHeight: 204, padding: space.xl, justifyContent: 'center', overflow: 'hidden', borderRadius: radius.lg },
  kicker: { ...type.label, color: '#D8C5B2', marginBottom: space.md },
  display: { ...type.display, fontFamily: 'serif', color: colors.white, fontSize: 37, lineHeight: 41 },
  heroSub: { ...type.body, color: '#E5DCD2', fontSize: 13, marginTop: space.sm, maxWidth: 230 },
  heroMark: { position: 'absolute', width: 142, height: 142, borderRadius: 71, right: -28, bottom: -44, borderWidth: 1, borderColor: 'rgba(255,252,248,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroMarkText: { color: 'rgba(255,252,248,0.14)', fontFamily: 'serif', fontSize: 76, fontWeight: '500' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.xl },
  sectionTitle: { ...type.title, fontFamily: 'serif', fontSize: 24, lineHeight: 29 },
  sub: { ...type.body, color: colors.slate, fontSize: 13, marginTop: 3 },
  count: { ...type.label, color: colors.terracotta, marginBottom: 3 },
  list: { paddingHorizontal: space.xl, paddingBottom: 140 },
  column: { gap: GAP, marginBottom: space.xl },
  skeletonWrap: { paddingHorizontal: space.xl },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, rowGap: space.xl },
  errorWrap: { paddingHorizontal: space.xl, gap: space.lg },
  errorText: { ...type.body, color: colors.danger },
});
