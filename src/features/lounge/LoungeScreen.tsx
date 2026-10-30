import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { BottomSheet } from '../../shared/components/BottomSheet';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { loungeColors as colors, radius, space, type } from '../../shared/theme/tokens';
import type { FashionBuilding, Stylist } from '../../shared/types/domain';
import { formatMoney } from '../../shared/utils/format';
import { useBuildingStore } from './buildingStore';
import { useLoungeStore } from './loungeStore';
import { StylistCard, StylistCardSkeleton } from './StylistCard';

const SKELETONS = [0, 1, 2];
const PROVIDER_ROLES: Record<string, RegExp> = {
  Barbershop: /barber|fade/i,
  'Beauty salon': /colour|styling/i,
  'Makeup studio': /makeup/i,
  'Fashion atelier': /designer|decor/i,
  'Wardrobe rental': /rental|wardrobe/i,
  'Tailoring studio': /designer|decor/i,
};

export function LoungeScreen({ searchTerm = '', swahili = false }: { searchTerm?: string; swahili?: boolean }) {
  const { height } = useWindowDimensions();
  const items = useLoungeStore((s) => s.items);
  const status = useLoungeStore((s) => s.status);
  const error = useLoungeStore((s) => s.error);
  const load = useLoungeStore((s) => s.load);
  const buildings = useBuildingStore((s) => s.items);
  const buildingStatus = useBuildingStore((s) => s.status);
  const buildingError = useBuildingStore((s) => s.error);
  const loadBuildings = useBuildingStore((s) => s.load);
  const [service, setService] = useState('All');
  const [selectedBuilding, setSelectedBuilding] = useState<FashionBuilding | null>(null);

  useEffect(() => {
    load();
    loadBuildings();
  }, [load, loadBuildings]);

  const visibleBuildings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return buildings
      .filter((building) => {
        const matchesSearch = !query || `${building.name} ${building.category} ${building.area} ${building.city} ${building.services.map((item) => item.name).join(' ')}`.toLowerCase().includes(query);
        const matchesService = service === 'All'
          || service === 'Barbers' && building.category === 'Barbershop'
          || service === 'Beauty' && building.category === 'Beauty salon'
          || service === 'Makeup' && building.category === 'Makeup studio'
          || service === 'Design' && ['Fashion atelier', 'Tailoring studio'].includes(building.category)
          || service === 'Rentals' && building.category === 'Wardrobe rental';
        return matchesSearch && matchesService;
      })
      .sort((a, b) => b.rating - a.rating || b.review_count - a.review_count);
  }, [buildings, searchTerm, service]);
  const buildingProviders = useMemo(() => {
    if (!selectedBuilding) return [];
    const rolePattern = PROVIDER_ROLES[selectedBuilding.category];
    return items.filter((stylist) => rolePattern.test(stylist.role));
  }, [items, selectedBuilding]);

  const header = (
    <Animated.View entering={FadeInDown.duration(650).springify()} style={styles.header}>
      <LinearGradient colors={[colors.black, '#497862']} style={styles.hero}>
        <Text style={styles.kicker}>{swahili ? 'SEBULE · WAKATI WAKO' : 'THE LOUNGE · YOUR MOMENT'}</Text>
        <Text style={styles.display}>{swahili ? 'Jipe muda{"\n"}wa kujitunza.' : 'Make time{"\n"}for yourself.'}</Text>
        <Text style={styles.heroSub}>{swahili ? 'Kutana na wataalamu. Panga miadi yako.' : 'Meet local artists. Book your chair. Feel like you.'}</Text>
        <View style={styles.heroMark}>
          <Text style={styles.heroMarkText}>FF</Text>
        </View>
      </LinearGradient>
      <View style={styles.serviceHeading}>
        <View>
            <Text style={styles.sectionTitle}>{swahili ? 'Pata sehemu yako' : 'Find your place'}</Text>
          <Text style={styles.sub}>{swahili ? 'Chagua sehemu, huduma na mtaalamu wako.' : 'Choose a studio, its services, and the provider for you.'}</Text>
        </View>
        <Text style={styles.count}>{visibleBuildings.length} SAMPLE PLACES</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.services}>
        {[
          ['⌂', 'All'],
          ['✂', 'Barbers'],
          ['✿', 'Beauty'],
          ['✦', 'Makeup'],
          ['◇', 'Design'],
          ['♧', 'Rentals'],
        ].map(([icon, label]) => (
          <Pressable key={label} onPress={() => setService(label)} style={styles.serviceCard} accessibilityRole="button">
            <View style={[styles.serviceIcon, service === label && styles.serviceIconActive]}>
              <Text style={[styles.serviceGlyph, service === label && styles.serviceGlyphActive]}>{icon}</Text>
            </View>
            <Text style={[styles.serviceName, service === label && styles.serviceNameActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>{swahili ? 'Sehemu za mitindo' : service === 'All' ? 'Fashion, beauty & care' : `${service} studios`}</Text>
          <Text style={styles.sub}>{swahili ? 'Chagua huduma unayoitaka.' : 'Browse sample studios, services and prices in TZS.'}</Text>
        </View>
        {visibleBuildings.length > 0 ? <Text style={styles.count}>{visibleBuildings.length} LISTINGS</Text> : null}
      </View>
    </Animated.View>
  );

  if ((status === 'loading' && items.length === 0) || (buildingStatus === 'loading' && buildings.length === 0)) {
    return (
      <View style={styles.pad}>
        {header}
        <View style={styles.gap}>
          {SKELETONS.map((i) => (
            <StylistCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if ((status === 'error' && items.length === 0) || (buildingStatus === 'error' && buildings.length === 0)) {
    return (
      <View style={[styles.pad, styles.gap]}>
        {header}
        <Text style={styles.error}>{error ?? buildingError ?? 'Could not load the lounge.'}</Text>
        <Pressable onPress={() => { load({ force: true }); loadBuildings({ force: true }); }} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={visibleBuildings}
        keyExtractor={(building) => building.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={status === 'refreshing' || buildingStatus === 'refreshing'}
            onRefresh={() => { load({ force: true }); loadBuildings({ force: true }); }}
            tintColor={colors.black}
          />
        }
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={40}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(Math.min(index, 5) * 35).duration(260)}>
            <BuildingCard building={item} onPress={() => setSelectedBuilding(item)} />
          </Animated.View>
        )}
      />
      <BuildingSheet
        building={selectedBuilding}
        providers={buildingProviders}
        height={height}
        onClose={() => setSelectedBuilding(null)}
      />
    </>
  );
}

function BuildingCard({ building, onPress }: { building: FashionBuilding; onPress: () => void }) {
  const startingPrice = Math.min(...building.services.map((service) => service.price_minor));
  return (
    <Pressable onPress={onPress} style={styles.buildingCard} accessibilityRole="button" accessibilityLabel={`Open sample ${building.category}, ${building.name}`}>
      <Image source={{ uri: building.cover_url }} style={styles.buildingImage} contentFit="cover" transition={160} />
      <View style={styles.buildingInfo}>
        <View style={styles.buildingHeading}>
          <View style={styles.sampleBadge}><Text style={styles.sampleBadgeText}>SAMPLE</Text></View>
          <Text style={styles.buildingRating}>★ {building.rating.toFixed(1)} ({building.review_count})</Text>
        </View>
        <Text style={styles.buildingCategory}>{building.category.toUpperCase()}</Text>
        <Text style={styles.buildingName}>{building.name}</Text>
        <Text style={styles.buildingArea}>{building.area}, {building.city}</Text>
        <View style={styles.buildingFooter}>
          <Text style={styles.buildingPrice}>Services from {formatMoney(startingPrice, 'TZS')}</Text>
          <Text style={styles.openBuilding}>VIEW STUDIO  →</Text>
        </View>
      </View>
    </Pressable>
  );
}

function BuildingSheet({
  building,
  providers,
  height,
  onClose,
}: {
  building: FashionBuilding | null;
  providers: Stylist[];
  height: number;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      visible={building !== null}
      onClose={onClose}
      surfaceColor={colors.white}
      backdropColor={colors.black}
      handleColor={colors.sand}
    >
      {building ? (
        <ScrollView
          style={{ maxHeight: height * 0.78 }}
          contentContainerStyle={styles.buildingSheet}
          showsVerticalScrollIndicator={false}
        >
          <Image source={{ uri: building.cover_url }} style={styles.buildingHeroImage} contentFit="cover" />
          <Text style={styles.buildingCategory}>{building.category.toUpperCase()} · SAMPLE LISTING</Text>
          <Text style={styles.sheetTitle}>{building.name}</Text>
          <Text style={styles.buildingArea}>{building.area}, {building.city} · ★ {building.rating.toFixed(1)} ({building.review_count} sample reviews)</Text>
          <Text style={styles.buildingDescription}>{building.description}</Text>

          <Text style={styles.sheetSectionTitle}>Services & price list</Text>
          {building.services.map((service) => (
            <View key={service.id} style={styles.serviceRow}>
              <View style={styles.serviceCopy}>
                <Text style={styles.listingServiceName}>{service.name}</Text>
                <Text style={styles.serviceDuration}>{service.duration_min >= 1440 ? 'Full-day booking' : `${service.duration_min} minutes`}</Text>
              </View>
              <Text style={styles.servicePrice}>{formatMoney(service.price_minor, 'TZS')}</Text>
            </View>
          ))}

          <Text style={styles.sheetSectionTitle}>Available providers</Text>
          {providers.length ? providers.map((provider) => <StylistCard key={provider.id} stylist={provider} buildingName={building.name} lounge />) : (
            <Text style={styles.buildingDescription}>No sample providers are listed for this service yet.</Text>
          )}
          <Text style={styles.sampleNotice}>All studios, prices, reviews, provider profiles, and appointment slots are illustrative preview data. No real business is represented and no appointment is confirmed.</Text>
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.xl },
  hero: { minHeight: 204, padding: space.xl, justifyContent: 'center', overflow: 'hidden', borderRadius: radius.lg },
  kicker: { ...type.label, color: '#CDE8D8', marginBottom: space.md },
  display: { ...type.display, fontFamily: 'serif', color: colors.white, fontSize: 35, lineHeight: 39 },
  heroSub: { ...type.body, color: '#E2EFE7', fontSize: 13, marginTop: space.sm },
  heroMark: { position: 'absolute', width: 142, height: 142, borderRadius: 71, right: -28, bottom: -44, borderWidth: 1, borderColor: 'rgba(255,252,248,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroMarkText: { color: 'rgba(255,252,248,0.14)', fontFamily: 'serif', fontSize: 76, fontWeight: '500' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.xl },
  serviceHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.md },
  services: { gap: space.sm, paddingRight: space.xl },
  serviceCard: { width: 77, alignItems: 'center', gap: 6 },
  serviceIcon: { width: 62, height: 62, borderRadius: radius.md, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center' },
  serviceIconActive: { backgroundColor: colors.black },
  serviceGlyph: { color: colors.terracotta, fontSize: 23 },
  serviceGlyphActive: { color: colors.white },
  serviceName: { fontSize: 10, color: colors.slate, fontWeight: '700' },
  serviceNameActive: { color: colors.black },
  sectionTitle: { ...type.title, color: colors.black, fontFamily: 'serif', fontSize: 24, lineHeight: 29 },
  sub: { ...type.body, color: colors.slate, fontSize: 13, marginTop: 3 },
  count: { ...type.label, color: colors.terracotta, marginBottom: 3 },
  list: { paddingHorizontal: space.xl, paddingBottom: 140 },
  pad: { paddingHorizontal: space.xl },
  gap: { gap: space.md },
  error: { ...type.body, color: colors.danger },
  retry: { alignSelf: 'flex-start', borderRadius: radius.pill, backgroundColor: colors.black, paddingVertical: 12, paddingHorizontal: 20 },
  retryText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  buildingCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.offWhite, overflow: 'hidden' },
  buildingImage: { width: '100%', height: 164, backgroundColor: colors.offWhite },
  buildingInfo: { padding: space.lg, gap: 5 },
  buildingHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  sampleBadge: { backgroundColor: colors.offWhite, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 8 },
  sampleBadgeText: { color: colors.terracotta, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  buildingRating: { color: colors.terracotta, fontSize: 10, fontWeight: '800' },
  buildingCategory: { ...type.label, color: colors.terracotta, fontSize: 8 },
  buildingName: { ...type.title, color: colors.black, fontFamily: 'serif', fontSize: 20 },
  buildingArea: { ...type.body, color: colors.slate, fontSize: 11 },
  buildingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.offWhite },
  buildingPrice: { ...type.body, color: colors.charcoal, fontSize: 11, fontWeight: '700' },
  openBuilding: { color: colors.terracotta, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  buildingSheet: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.sm },
  buildingHeroImage: { width: '100%', height: 190, borderRadius: radius.md, marginBottom: space.sm, backgroundColor: colors.offWhite },
  sheetTitle: { ...type.display, color: colors.black, fontFamily: 'serif', fontSize: 30, lineHeight: 36 },
  buildingDescription: { ...type.body, color: colors.slate, fontSize: 12, lineHeight: 18 },
  sheetSectionTitle: { ...type.title, color: colors.black, fontFamily: 'serif', fontSize: 20, marginTop: space.lg, marginBottom: space.xs },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.offWhite, paddingVertical: space.md },
  serviceCopy: { flex: 1, gap: 3 },
  listingServiceName: { ...type.body, color: colors.charcoal, fontWeight: '700', fontSize: 13 },
  serviceDuration: { ...type.body, color: colors.slate, fontSize: 10 },
  servicePrice: { ...type.price, color: colors.black, fontSize: 13 },
  sampleNotice: { ...type.body, color: colors.slate, fontSize: 10, lineHeight: 15, marginTop: space.md },
});
