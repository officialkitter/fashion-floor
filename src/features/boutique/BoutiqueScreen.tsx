import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { Extrapolation, FadeInDown, FadeInUp, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { colors, radius, space, type } from '../../shared/theme/tokens';
import type { Product } from '../../shared/types/domain';
import { useBoutiqueStore } from './boutiqueStore';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { SizeSheet } from './SizeSheet';

const GAP = space.md;
const SKELETONS = [0, 1, 2, 3];
const AnimatedProductList = Animated.createAnimatedComponent(FlatList<Product>);
const AnimatedHeroList = Animated.createAnimatedComponent(FlatList<HeroSlide>);
type HeroSlide = { id: string; image: string; kicker: string; title: string; description: string };
const heroSlides: HeroSlide[] = [
  { id: 'new-season', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200', kicker: 'THE BOUTIQUE · DAR ES SALAAM', title: 'A world of\ngood taste.', description: 'One floor. The brands you love. Curated for you.' },
  { id: 'thoughtful-style', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200', kicker: 'FIND YOUR NEXT FAVORITE', title: 'Style that\nfeels like you.', description: 'Explore a considered edit from brands and independent labels.' },
  { id: 'independent-labels', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200', kicker: 'BIG NAMES · NEW VOICES', title: 'Discover\nother brands.', description: 'Meet emerging designers and one-of-a-kind local finds.' },
];
const categories = [
  { name: 'All', icon: '✦' },
  { name: 'Brands', icon: '◇' },
  { name: 'Stores', icon: '⌂' },
  { name: 'Men', icon: '◌' },
  { name: 'Women', icon: '◍' },
  { name: 'Kids', icon: '♧' },
  { name: 'Jewelry', icon: '✧' },
  { name: 'Other brands', icon: '◈' },
];

export function BoutiqueScreen({ searchTerm = '', swahili = false }: { searchTerm?: string; swahili?: boolean }) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - space.xl * 2 - GAP) / 2;

  const items = useBoutiqueStore((s) => s.items);
  const status = useBoutiqueStore((s) => s.status);
  const error = useBoutiqueStore((s) => s.error);
  const load = useBoutiqueStore((s) => s.load);
  const loadMore = useBoutiqueStore((s) => s.loadMore);

  // `selected` outlives `open` so the product stays rendered during the close animation.
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showOffers, setShowOffers] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const hasProductFilters = category !== 'All' || selectedBrand !== null || searchTerm.trim().length > 0;
  const showEditorialSections = !hasProductFilters;

  useEffect(() => {
    load();
  }, [load]);

  const onSelect = useCallback((p: Product) => {
    setSelected(p);
    setOpen(true);
  }, []);

  const showSkeleton = status === 'loading' && items.length === 0;
  const showError = status === 'error' && items.length === 0;
  const visibleItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const categoryMatches: Record<string, string[]> = {
      Men: ['p1', 'p3', 'p4', 'p5'],
      Women: ['p2', 'p6', 'p7', 'p10', 'p11'],
      Kids: ['p8'],
      Jewelry: ['p9'],
    };
    return items.filter((item) =>
      (!query || `${item.title} ${item.brand_tag.label} ${item.seller_name ?? ''} ${item.category ?? ''}`.toLowerCase().includes(query))
      && (!selectedBrand || (selectedBrand === 'other-brands'
        ? item.marketplace_category === 'other-brand'
        : item.brand_tag.label.toLowerCase().includes(selectedBrand)))
      && (category !== 'Other brands' || item.marketplace_category === 'other-brand')
      && (!categoryMatches[category] || categoryMatches[category].includes(item.id)),
    ).sort((a, b) => {
      if (!a.catalog_key || a.catalog_key !== b.catalog_key) return 0;
      return (b.seller_rating ?? 0) - (a.seller_rating ?? 0)
        || (b.seller_review_count ?? 0) - (a.seller_review_count ?? 0)
        || (b.units_sold ?? 0) - (a.units_sold ?? 0);
    });
  }, [category, items, searchTerm, selectedBrand]);
  const brands = useMemo(() => {
    const summaries = new Map<string, { id: string; label: string; rating: number; reviews: number; count: number }>();
    items.forEach((product) => {
      const current = summaries.get(product.brand_tag.id) ?? {
        id: product.brand_tag.id,
        label: product.brand_tag.label,
        rating: 0,
        reviews: 0,
        count: 0,
      };
      current.rating += product.rating ?? 0;
      current.reviews += product.review_count ?? 0;
      current.count += 1;
      summaries.set(product.brand_tag.id, current);
    });
    return [...summaries.values()].sort((a, b) =>
      (b.rating / b.count) - (a.rating / a.count) || b.reviews - a.reviews,
    );
  }, [items]);

  const header = (
    <Animated.View entering={FadeInDown.duration(650).springify()} style={styles.header}>
      <BoutiqueHeroCarousel />
      <View style={styles.categoriesHeading}>
        <Text style={styles.sectionTitleSmall}>{swahili ? 'Nunua kwa mtindo wako' : 'Shop your way'}</Text>
        <Text style={styles.sub}>{swahili ? 'Gundua bidhaa mbalimbali' : 'Discover the floor'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {categories.map((item) => (
          <Pressable key={item.name} onPress={() => { setCategory(item.name); setSelectedBrand(null); }} style={styles.categoryItem} accessibilityRole="button">
            <View style={[styles.categoryIcon, category === item.name && styles.categoryIconActive]}>
              <Text style={[styles.categoryGlyph, category === item.name && styles.categoryGlyphActive]}>{item.icon}</Text>
            </View>
            <Text style={[styles.categoryText, category === item.name && styles.categoryTextActive]}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {showEditorialSections ? <LinearGradient colors={['#F2E6D8', '#E9D3C0']} style={styles.promo}>
        <View style={styles.promoCopy}>
          <Text style={styles.promoKicker}>THE GOOD THINGS EDIT</Text>
          <Text style={styles.promoTitle}>A little treat, on us.</Text>
          <Text style={styles.promoDescription}>Discover this week's in-store offers and thoughtful finds.</Text>
          <Pressable onPress={() => setShowOffers((shown) => !shown)} style={styles.promoButton}>
            <Text style={styles.promoButtonText}>{showOffers ? 'Close offers  ↑' : 'Explore offers  →'}</Text>
          </Pressable>
        </View>
        <View style={styles.promoRound}><Text style={styles.promoRoundText}>−20%</Text></View>
      </LinearGradient> : null}
      {showEditorialSections && showOffers ? (
        <View style={styles.offerDetails}>
          <Text style={styles.offerTitle}>This week on the floor</Text>
          <Text style={styles.offerCopy}>Selected partner boutique pieces are up to 20% off. Offer availability is shown as a local preview.</Text>
        </View>
      ) : null}
      {showEditorialSections ? (
        <>
          <View style={styles.railHeading}>
            <Text style={styles.sectionTitleSmall}>Brands to know</Text>
            <Text style={styles.seeAll}>SEE ALL</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRail}>
            {brands.map((brand, index) => (
              <Pressable key={brand.id} onPress={() => { setCategory('Brands'); setSelectedBrand(brand.label.toLowerCase()); }} style={[styles.brandTile, index % 2 === 1 && styles.brandTileAlt]}>
                <Text style={styles.brandWord}>{brand.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => { setCategory('Brands'); setSelectedBrand('other-brands'); }} style={[styles.brandTile, styles.brandTileAlt]}>
              <Text style={styles.brandWord}>Other brands</Text>
            </Pressable>
          </ScrollView>
        </>
      ) : null}
      {showEditorialSections && visibleItems.length > 0 ? <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>{swahili ? 'Zilizowasili' : 'Just arrived'}</Text>
          <Text style={styles.sub}>{swahili ? 'Mitindo inayopendwa hivi sasa.' : 'The pieces everyone is talking about.'}</Text>
        </View>
        {visibleItems.length > 0 ? <Text style={styles.count}>SEE ALL  ↗</Text> : null}
      </View> : null}
      {showEditorialSections && visibleItems.length > 0 ? <SpotlightCarousel items={visibleItems} onSelect={onSelect} /> : null}
      {visibleItems.length > 0 ? (
        <View style={[styles.sectionRow, styles.floorHeading]}>
          <View>
            <Text style={styles.sectionTitle}>The floor edit</Text>
            <Text style={styles.sub}>Curated from our partner boutiques.</Text>
          </View>
          <Text style={styles.count}>SEE ALL  ↗</Text>
        </View>
      ) : null}
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
        data={visibleItems}
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
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={40}
        windowSize={5}
        removeClippedSubviews
        onEndReached={() => { void loadMore(); }}
        onEndReachedThreshold={0.5}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(Math.min(index, 5) * 35).duration(260)} style={{ width: cardWidth }}>
            <ProductCard product={item} width={cardWidth} onPress={onSelect} />
          </Animated.View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No pieces match this edit yet.</Text>
            <Text style={styles.sub}>Try another brand, category or search.</Text>
          </View>
        )}
        ListFooterComponent={
          <>
            {status === 'error' && items.length > 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.sub}>{error ?? 'Could not load more pieces.'}</Text>
                <PrimaryButton label="Try again" onPress={() => load({ force: true })} />
              </View>
            ) : null}
            {showEditorialSections ? (
          <View style={styles.footer}>
            <View style={styles.footerHeading}>
              <View><Text style={styles.sectionTitle}>Trending now</Text><Text style={styles.sub}>An edit worth a second look.</Text></View>
              <Text style={styles.count}>SEE ALL  ↗</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRail}>
              {[
                ['The everyday icon', 'A considered classic'],
                ['Made to be noticed', 'A little evening magic'],
              ].map(([title, subtitle], index) => (
                <LinearGradient key={title} colors={index ? ['#D5B8A2', '#99745E'] : ['#D7D4CF', '#79756F']} style={styles.trendTile}>
                  <Text style={styles.trendEyebrow}>THE FF EDIT · 0{index + 1}</Text>
                  <Text style={styles.trendTitle}>{title}</Text>
                  <Text style={styles.trendSubtitle}>{subtitle}</Text>
                </LinearGradient>
              ))}
            </ScrollView>
            <View style={styles.footerHeading}>
              <View><Text style={styles.sectionTitle}>Recommended stores</Text><Text style={styles.sub}>Local boutiques, carefully chosen.</Text></View>
              <Text style={styles.count}>SEE ALL  ↗</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeRail}>
              {[
                ['The Wardrobe', 'Everyday, considered', 'photo-1490481651871-ab68de25d43d'],
                ['Studio Kuro', 'Modern essentials', 'photo-1483985988355-763728e1935b'],
                ['Maison Onyx', 'A little occasion', 'photo-1539109136881-3be0616acf4b'],
              ].map(([name, subtitle, photo]) => (
                <Pressable key={name} onPress={() => setSelectedStore(name)} style={styles.storeCard}>
                  <Image source={{ uri: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&q=65` }} style={styles.storeImage} contentFit="cover" cachePolicy="memory-disk" />
                  <Text style={styles.storeName}>{name}</Text>
                  <Text style={styles.storeSubtitle}>{subtitle}  ·  ★ 4.9</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.storeNote}>
              <Text style={styles.storeNoteTitle}>Great style, from great stores.</Text>
              <Text style={styles.storeNoteCopy}>Meet the independent Tanzanian boutiques behind every find.</Text>
            </View>
          </View>
            ) : null}
          </>
        }
      />
      <SizeSheet product={selected} visible={open} onClose={() => setOpen(false)} />
      <BottomSheet visible={selectedStore !== null} onClose={() => setSelectedStore(null)}>
        <View style={styles.storeSheet}>
          <Text style={styles.kicker}>FASHION FLOOR PARTNER</Text>
          <Text style={styles.storeSheetTitle}>{selectedStore}</Text>
          <Text style={styles.storeSheetCopy}>A locally curated boutique bringing thoughtful style to Dar es Salaam. Explore new arrivals, store favorites and a personal edit from this partner.</Text>
          <View style={styles.storeFacts}>
            <Text style={styles.storeFact}>★ 4.9  ·  120+ reviews</Text>
            <Text style={styles.storeFact}>Dar es Salaam  ·  Same-city delivery</Text>
          </View>
          <PrimaryButton label="Browse this store" onPress={() => { setCategory('Stores'); setSelectedBrand(null); setSelectedStore(null); }} />
        </View>
      </BottomSheet>
    </>
  );
}

function BoutiqueHeroCarousel() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<HeroSlide>>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeIndexRef.current + 1) % heroSlides.length;
      activeIndexRef.current = next;
      setActiveIndex(next);
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [width]);

  return (
    <AnimatedHeroList
      ref={listRef}
      data={heroSlides}
      horizontal
      pagingEnabled
      bounces={false}
      showsHorizontalScrollIndicator={false}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={2}
      removeClippedSubviews
      getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      keyExtractor={(slide) => slide.id}
      onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        activeIndexRef.current = index;
        setActiveIndex(index);
      }}
      renderItem={({ item }) => (
        <View style={[styles.hero, { width }]}>
          <Image
            source={{ uri: item.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={350}
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={['rgba(24,19,16,0.12)', 'rgba(24,19,16,0.76)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>{item.kicker}</Text>
            <Text style={styles.display}>{item.title}</Text>
            <Text style={styles.heroSub}>{item.description}</Text>
          </View>
          <View style={styles.heroPagination}>
            {heroSlides.map((slide, index) => (
              <Pressable
                key={slide.id}
                onPress={() => {
                  activeIndexRef.current = index;
                  setActiveIndex(index);
                  listRef.current?.scrollToOffset({ offset: index * width, animated: true });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Show featured slide ${index + 1}`}
                accessibilityState={{ selected: activeIndex === index }}
                hitSlop={8}
              >
                <View style={[styles.heroDot, activeIndex === index && styles.heroDotActive]} />
              </Pressable>
            ))}
          </View>
        </View>
      )}
    />
  );
}

function SpotlightCarousel({
  items,
  onSelect,
}: {
  items: Product[];
  onSelect: (product: Product) => void;
}) {
  const { width } = useWindowDimensions();
  const viewportWidth = width - space.xl * 2;
  const cardWidth = viewportWidth * 0.68;
  const step = cardWidth + space.md;
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  if (items.length === 0) return null;

  return (
    <AnimatedProductList
      data={items}
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={step}
      bounces={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      getItemLayout={(_, itemIndex) => ({ length: step, offset: step * itemIndex, index: itemIndex })}
      contentContainerStyle={{ paddingHorizontal: (viewportWidth - cardWidth) / 2 }}
      style={{ width: viewportWidth, overflow: 'visible' }}
      keyExtractor={(item) => `spotlight-${item.id}`}
      ItemSeparatorComponent={() => <View style={{ width: space.md }} />}
      renderItem={({ item, index: itemIndex }) => (
        <SpotlightProduct
          product={item}
          width={cardWidth}
          index={itemIndex}
          step={step}
          scrollX={scrollX}
          onPress={onSelect}
        />
      )}
    />
  );
}

function SpotlightProduct({
  product,
  width,
  index,
  step,
  scrollX,
  onPress,
}: {
  product: Product;
  width: number;
  index: number;
  step: number;
  scrollX: Animated.SharedValue<number>;
  onPress: (product: Product) => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const range = [(index - 1) * step, index * step, (index + 1) * step];
    return {
      opacity: interpolate(scrollX.value, range, [0.55, 1, 0.55], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(scrollX.value, range, [0.82, 1, 0.82], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={[{ width }, animatedStyle]}>
      <ProductCard product={product} width={width} onPress={onPress} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.xl },
  hero: { height: 236, justifyContent: 'center', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.black },
  heroCopy: { paddingHorizontal: space.xl, paddingBottom: 8, maxWidth: 350 },
  kicker: { ...type.label, color: '#D8C5B2', marginBottom: space.md },
  display: { ...type.display, fontFamily: 'serif', color: colors.white, fontSize: 37, lineHeight: 41 },
  heroSub: { ...type.body, color: '#E5DCD2', fontSize: 13, marginTop: space.sm, maxWidth: 230 },
  heroPagination: { position: 'absolute', right: space.lg, bottom: space.lg, flexDirection: 'row', gap: 6 },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  heroDotActive: { width: 22, backgroundColor: colors.white },
  emptyState: { alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxl, gap: space.sm },
  emptyTitle: { ...type.title, fontFamily: 'serif', textAlign: 'center' },
  heroPill: { position: 'absolute', left: space.xl, bottom: 13, borderWidth: 1, borderColor: 'rgba(255,252,248,0.35)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  heroPillText: { color: colors.white, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  heroMark: { position: 'absolute', width: 142, height: 142, borderRadius: 71, right: -28, bottom: -44, borderWidth: 1, borderColor: 'rgba(255,252,248,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroMarkText: { color: 'rgba(255,252,248,0.14)', fontFamily: 'serif', fontSize: 76, fontWeight: '500' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.xl },
  floorHeading: { marginBottom: space.lg },
  sectionTitle: { ...type.title, fontFamily: 'serif', fontSize: 24, lineHeight: 29 },
  sub: { ...type.body, color: colors.slate, fontSize: 13, marginTop: 3 },
  count: { ...type.label, color: colors.terracotta, marginBottom: 3 },
  list: { paddingHorizontal: space.xl, paddingBottom: 140 },
  column: { gap: GAP, marginBottom: space.xl },
  categoriesHeading: { marginTop: space.xl, marginBottom: space.sm },
  sectionTitleSmall: { ...type.title, fontSize: 17 },
  categories: { gap: space.md, paddingVertical: space.xs, paddingRight: space.xl },
  categoryItem: { minWidth: 58, alignItems: 'center', gap: 6 },
  categoryIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ECE4DC' },
  categoryIconActive: { backgroundColor: colors.black, borderColor: colors.black },
  categoryGlyph: { fontSize: 20, color: colors.terracotta },
  categoryGlyphActive: { color: colors.white },
  categoryText: { color: colors.slate, fontSize: 10, fontWeight: '700' },
  categoryTextActive: { color: colors.black },
  promo: { minHeight: 150, borderRadius: radius.lg, padding: space.lg, marginTop: space.xl, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoCopy: { flex: 1, maxWidth: '72%' },
  promoKicker: { color: colors.terracotta, fontSize: 8, fontWeight: '800', letterSpacing: 1.4 },
  promoTitle: { ...type.title, fontFamily: 'serif', fontSize: 20, marginTop: 5 },
  promoDescription: { ...type.body, color: colors.charcoal, fontSize: 10, lineHeight: 14, marginTop: 4 },
  promoButton: { alignSelf: 'flex-start', marginTop: space.sm },
  promoButtonText: { color: colors.terracotta, fontSize: 10, fontWeight: '800' },
  offerDetails: { backgroundColor: colors.offWhite, borderRadius: radius.md, padding: space.md, marginTop: space.sm },
  offerTitle: { ...type.title, fontSize: 14 },
  offerCopy: { ...type.body, color: colors.slate, fontSize: 11, lineHeight: 16, marginTop: 3 },
  promoRound: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.terracotta, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  promoRoundText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  railHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  seeAll: { ...type.label, color: colors.terracotta, fontSize: 8 },
  brandRail: { gap: space.sm, paddingRight: space.xl },
  brandTile: { width: 90, height: 56, borderRadius: radius.md, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center' },
  brandTileAlt: { backgroundColor: '#F5F0EA' },
  brandWord: { color: colors.black, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  footer: { paddingBottom: space.xxl },
  footerHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: space.md },
  trendingRail: { gap: space.md, paddingRight: space.xl },
  trendTile: { width: 235, height: 150, borderRadius: radius.lg, padding: space.lg, justifyContent: 'flex-end', overflow: 'hidden' },
  trendEyebrow: { color: '#F4E8DD', fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
  trendTitle: { color: colors.white, fontFamily: 'serif', fontSize: 23, lineHeight: 27, marginTop: 5 },
  trendSubtitle: { color: '#F4E8DD', fontSize: 10, marginTop: 3 },
  storeRail: { gap: space.md, paddingRight: space.xl },
  storeCard: { width: 210, paddingBottom: space.sm },
  storeImage: { width: 210, height: 128, borderRadius: radius.md, backgroundColor: colors.offWhite },
  storeName: { ...type.title, fontSize: 15, marginTop: space.sm },
  storeSubtitle: { ...type.body, color: colors.slate, fontSize: 10, marginTop: 2 },
  storeSheet: { paddingHorizontal: space.xl, paddingTop: 42, paddingBottom: space.xl, gap: space.md },
  storeSheetTitle: { ...type.display, fontFamily: 'serif', fontSize: 32, lineHeight: 38 },
  storeSheetCopy: { ...type.body, color: colors.slate, fontSize: 13, lineHeight: 19 },
  storeFacts: { backgroundColor: colors.offWhite, padding: space.md, borderRadius: radius.md, gap: 6 },
  storeFact: { ...type.body, color: colors.charcoal, fontSize: 11, fontWeight: '600' },
  storeNote: { backgroundColor: colors.offWhite, borderRadius: radius.md, padding: space.lg, marginTop: space.xl },
  storeNoteTitle: { ...type.title, fontFamily: 'serif', fontSize: 18 },
  storeNoteCopy: { ...type.body, color: colors.slate, fontSize: 11, marginTop: 3 },
  skeletonWrap: { paddingHorizontal: space.xl },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, rowGap: space.xl },
  errorWrap: { paddingHorizontal: space.xl, gap: space.lg },
  errorText: { ...type.body, color: colors.danger },
});
