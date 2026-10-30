import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AccountSheet } from './AccountSheet';
import { WelcomeExperience } from '../features/launch/WelcomeExperience';
import { BoutiqueScreen } from '../features/boutique/BoutiqueScreen';
import { ProductCard } from '../features/boutique/ProductCard';
import { useFavoritesStore } from '../features/boutique/favoritesStore';
import { SizeSheet } from '../features/boutique/SizeSheet';
import { CartBar } from '../features/cart/CartBar';
import { CartSheet } from '../features/cart/CartSheet';
import { LoungeScreen } from '../features/lounge/LoungeScreen';
import { DualZoneSlider } from '../shared/components/Slider';
import { colors, loungeColors, radius, space, type } from '../shared/theme/tokens';
import type { Product } from '../shared/types/domain';
import { useBoutiqueStore } from '../features/boutique/boutiqueStore';
import { useLoungeStore } from '../features/lounge/loungeStore';
import { StylistCard } from '../features/lounge/StylistCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettingsStore } from '../shared/state/appSettingsStore';
import { ApiError, getCustomerBookings, getCustomerOrders } from '../shared/api/client';
import { formatMoney, formatTime } from '../shared/utils/format';

type Department = 'boutique' | 'lounge';
type MainTab = 'Discovery' | 'Wishlist' | 'Orders' | 'Explore' | 'Favorites' | 'Bookings';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [entered, setEntered] = useState(false);
  const [department, setDepartment] = useState<Department>('boutique');
  const [tab, setTab] = useState<MainTab>('Discovery');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authRevision, setAuthRevision] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const favorites = useFavoritesStore((state) => state.productIds);
  const products = useBoutiqueStore((state) => state.items);
  const swahili = useAppSettingsStore((state) => state.language === 'sw');
  const profileName = useAppSettingsStore((state) => state.profileName);
  const profileImageUri = useAppSettingsStore((state) => state.profileImageUri);
  const locationLabel = useAppSettingsStore((state) => state.locationLabel);
  const setLocationLabel = useAppSettingsStore((state) => state.setLocationLabel);
  const palette = department === 'lounge' ? loungeColors : colors;
  const refreshCustomerActivity = useCallback(() => setAuthRevision((revision) => revision + 1), []);

  const tabs: MainTab[] = department === 'boutique'
    ? ['Discovery', 'Wishlist', 'Orders']
    : ['Explore', 'Favorites', 'Bookings'];
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) =>
      (!query || `${product.title} ${product.brand_tag.label} ${product.seller_name ?? ''} ${product.category ?? ''}`.toLowerCase().includes(query))
      && favorites.includes(product.id),
    );
  }, [favorites, products, search]);

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setSizeOpen(true);
  };

  const updateCurrentLocation = async () => {
    if (locationLoading) return;
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location permission needed', 'Allow location access to show your nearby city and studios.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      const city = place?.city ?? place?.subregion ?? place?.region;
      const country = place?.country;
      if (!city) {
        Alert.alert('Location unavailable', 'We could not identify your city. Please try again.');
        return;
      }
      setLocationLabel([city, country].filter(Boolean).join(', '));
    } catch (error) {
      Alert.alert('Could not get location', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  if (!entered) return <WelcomeExperience onEnter={() => setEntered(true)} />;

  return (
    <View style={[styles.root, { backgroundColor: palette.white }]}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: 7, backgroundColor: palette.white }]}>
        <Pressable onPress={() => setAccountOpen(true)} style={styles.menuButton} accessibilityRole="button" accessibilityLabel="Open settings and notifications">
          <Text style={[styles.headerIcon, { color: palette.black }]}>☰</Text>
        </Pressable>
        <View style={styles.brand}>
          <Pressable onPress={() => setAccountOpen(true)} accessibilityRole="button" accessibilityLabel={`Edit profile for ${profileName}`}>
            <Text style={[styles.wordmark, { color: palette.black }]} numberOfLines={1}>{profileName}</Text>
          </Pressable>
          <Pressable onPress={updateCurrentLocation} disabled={locationLoading} accessibilityRole="button" accessibilityLabel="Use current location">
            <Text style={[styles.location, { color: palette.slate }]}>
              {locationLoading ? 'Finding your location…' : `${locationLabel}  ·  TAP TO UPDATE`}
            </Text>
          </Pressable>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setCartOpen(true)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={department === 'lounge' ? 'Open bookings' : 'Open orders and bag'}>
            <Text style={[styles.headerIcon, { color: palette.black }]}>{department === 'lounge' ? '◷' : '▱'}</Text>
          </Pressable>
          <Pressable onPress={() => setAccountOpen(true)} style={styles.profileIdentity} accessibilityRole="button" accessibilityLabel="Open profile and photo settings">
            {profileImageUri
              ? <Image source={{ uri: profileImageUri }} style={[styles.profileButton, { backgroundColor: palette.offWhite }]} contentFit="cover" />
              : <View style={[styles.profileButton, { backgroundColor: palette.offWhite }]}><Text style={[styles.profileLetter, { color: palette.black }]}>{profileName.trim().charAt(0).toUpperCase() || 'U'}</Text></View>}
          </Pressable>
        </View>
      </View>
      <View style={[
        styles.searchWrap,
        searchFocused && styles.searchFocused,
        {
          backgroundColor: searchFocused ? palette.white : palette.offWhite,
          borderColor: searchFocused ? palette.sand : palette.offWhite,
        },
      ]}>
        <Text style={[styles.searchIcon, { color: palette.terracotta }]}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder={swahili
            ? department === 'boutique' ? 'Tafuta chapa, bidhaa, maduka...' : 'Tafuta huduma au mtaalamu...'
            : department === 'boutique' ? 'Search brands, pieces, stores...' : 'Find a service or artist...'}
          placeholderTextColor={palette.slate}
          style={[styles.searchInput, { color: palette.black }]}
          returnKeyType="search"
          accessibilityLabel="Search Fashion Floor"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
            <Text style={[styles.clearSearch, { color: palette.slate }]}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <DualZoneSlider
        labels={swahili ? ['Duka', 'Sebule'] : ['The Boutique', 'The Lounge']}
        left={
          department === 'boutique'
            ? tab === 'Discovery' ? <BoutiqueScreen searchTerm={search} swahili={swahili} />
              : tab === 'Wishlist' ? <FavoritesPage products={filteredProducts} onOpenProduct={openProduct} swahili={swahili} />
                : <OrdersPage department="boutique" swahili={swahili} onSignIn={() => setAccountOpen(true)} authRevision={authRevision} />
            : <BoutiqueScreen searchTerm={search} swahili={swahili} />
        }
        right={
          department === 'lounge'
            ? tab === 'Explore' ? <LoungeScreen searchTerm={search} swahili={swahili} />
              : tab === 'Favorites' ? <FavoritesPage products={[]} onOpenProduct={openProduct} lounge swahili={swahili} />
                : <OrdersPage department="lounge" swahili={swahili} onSignIn={() => setAccountOpen(true)} authRevision={authRevision} />
            : <LoungeScreen searchTerm={search} swahili={swahili} />
        }
        initialIndex={department === 'boutique' ? 0 : 1}
        activeColor={palette.black}
        trackColor={palette.offWhite}
        onIndexChange={(index) => {
          const next = index === 0 ? 'boutique' : 'lounge';
          setDepartment(next);
          setTab(next === 'boutique' ? 'Discovery' : 'Explore');
        }}
      />
      <View style={[
        styles.bottomBar,
        {
          bottom: Math.max(insets.bottom, 10),
          backgroundColor: palette.white,
          borderColor: palette.sand,
        },
      ]}>
        {tabs.map((label, index) => {
          const active = tab === label;
          const icon = department === 'boutique'
            ? ['⌂', '♡', '▤'][index]
            : ['⌕', '♡', '◷'][index];
          return (
            <Pressable
              key={label}
              onPress={() => setTab(label)}
              style={[styles.tab, active && styles.activeTab, active && { backgroundColor: palette.black }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              <Text style={[styles.tabIcon, { color: active ? palette.white : palette.slate }]}>{icon}</Text>
              {active ? <Text style={styles.tabLabel}>{tabTitle(label, swahili)}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      <CartBar onPress={() => setCartOpen(true)} bottomOffset={insets.bottom + 82} lounge={department === 'lounge'} />
      <CartSheet visible={cartOpen} onClose={() => setCartOpen(false)} onSignIn={() => setAccountOpen(true)} lounge={department === 'lounge'} />
      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} onAuthChange={refreshCustomerActivity} lounge={department === 'lounge'} />
      <SizeSheet product={selectedProduct} visible={sizeOpen} onClose={() => setSizeOpen(false)} />
    </View>
  );
}

interface CustomerActivity {
  id: string;
  status: string;
  title: string;
  brand: string;
  detail: string;
  image: string;
  ongoing: boolean;
}

function OrdersPage({ department, swahili, onSignIn, authRevision }: { department: Department; swahili: boolean; onSignIn: () => void; authRevision: number }) {
  const palette = department === 'lounge' ? loungeColors : colors;
  const [filter, setFilter] = useState<'All' | 'Ongoing' | 'Past'>('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const isBoutique = department === 'boutique';
  const [rows, setRows] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRequiresSignIn(false);

    void (async () => {
      try {
        if (isBoutique) {
          const orders = await getCustomerOrders();
          const nextRows = orders.map((order): CustomerActivity => {
            const date = new Date(order.created_at).toLocaleDateString(swahili ? 'sw-TZ' : 'en-TZ', { dateStyle: 'medium' });
            return {
              id: order.id,
              status: order.status,
              title: order.order_items[0]?.title ?? `${order.order_items.length} items`,
              brand: `${order.order_items.reduce((count, item) => count + item.quantity, 0)} items`,
              detail: `Order · ${date} · ${formatMoney(order.subtotal_minor, order.currency)}`,
              image: order.order_items[0]?.image_url ?? '',
              ongoing: ['pending', 'processing', 'paid'].includes(order.status),
            };
          });
          if (active) setRows(nextRows);
        } else {
          const bookings = await getCustomerBookings();
          const nextRows = bookings.map((booking): CustomerActivity => {
            const startsAt = new Date(booking.starts_at);
            return {
              id: booking.id,
              status: booking.status,
              title: booking.business_services?.name ?? 'Appointment',
              brand: [booking.businesses?.name, booking.stylists?.name].filter(Boolean).join(' · ') || 'Fashion service',
              detail: `${startsAt.toLocaleDateString(swahili ? 'sw-TZ' : 'en-TZ', { dateStyle: 'medium' })} · ${formatTime(booking.starts_at)} · ${formatMoney(booking.price_minor, booking.currency)}`,
              image: '',
              ongoing: startsAt.getTime() >= Date.now() && ['pending', 'confirmed'].includes(booking.status),
            };
          });
          if (active) setRows(nextRows);
        }
      } catch (loadError) {
        if (active) {
          setRequiresSignIn(loadError instanceof ApiError && loadError.status === 401);
          setError(loadError instanceof Error ? loadError.message : 'Could not load your records.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [authRevision, isBoutique, swahili]);

  const visibleRows = rows
    .map((row, index) => ({ row, originalIndex: index }))
    .filter(({ row }) => filter === 'All' || (filter === 'Ongoing' ? row.ongoing : !row.ongoing));

  return (
    <ScrollView style={[styles.page, { backgroundColor: palette.white }]} contentContainerStyle={styles.orderContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeading}>
        <Text style={[styles.pageKicker, { color: palette.terracotta }]}>{isBoutique ? 'YOUR FASHION FLOOR' : 'YOUR MOMENTS'}</Text>
        <Text style={[styles.pageTitle, { color: palette.black }]}>{swahili ? isBoutique ? 'Maagizo' : 'Miadi' : isBoutique ? 'Orders' : 'Bookings'}</Text>
        <Text style={[styles.pageSub, { color: palette.slate }]}>{swahili
          ? isBoutique ? 'Fuatilia mzigo wako, pata risiti au omba msaada.' : 'Miadi yako ijayo na ya zamani.'
          : isBoutique ? 'Track your delivery, find your receipt, or get a hand.' : 'Every appointment, upcoming and remembered.'}</Text>
      </View>
      <View style={styles.orderFilters}>
        {(['All', 'Ongoing', 'Past'] as const).map((filterName, index) => (
          <Pressable
            key={filterName}
            onPress={() => setFilter(filterName)}
            style={[
              styles.orderFilter,
              { borderColor: palette.offWhite },
              filter === filterName && { backgroundColor: palette.black, borderColor: palette.black },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === filterName }}
          >
            <Text style={[styles.orderFilterText, { color: filter === filterName ? palette.white : palette.slate }]}>
              {swahili ? ['Zote', 'Zinaendelea', 'Zilizopita'][index] : filterName}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <View style={styles.orderEmpty}>
          <ActivityIndicator color={palette.terracotta} />
          <Text style={[styles.pageSub, { color: palette.slate, marginTop: space.sm }]}>{swahili ? 'Inapakia taarifa zako…' : 'Loading your records…'}</Text>
        </View>
      ) : error ? (
        <View style={[styles.orderEmpty, { backgroundColor: palette.offWhite }]}>
          <Text style={[styles.orderTitle, { color: palette.black }]}>{requiresSignIn ? 'Sign in to see your activity' : 'Your activity could not be loaded'}</Text>
          <Text style={[styles.pageSub, { color: palette.slate, textAlign: 'center' }]}>{error}</Text>
          {requiresSignIn ? (
            <Pressable onPress={onSignIn} style={[styles.saveButton, { backgroundColor: palette.black }]}>
              <Text style={styles.saveButtonText}>Open account</Text>
            </Pressable>
          ) : null}
        </View>
      ) : visibleRows.length === 0 ? (
        <View style={[styles.orderEmpty, { backgroundColor: palette.offWhite }]}>
          <Text style={[styles.orderTitle, { color: palette.black }]}>{rows.length === 0 ? (isBoutique ? 'Your orders will appear here' : 'Your bookings will appear here') : 'No activity in this filter'}</Text>
          <Text style={[styles.pageSub, { color: palette.slate, textAlign: 'center' }]}>{rows.length === 0 ? 'Your Fashion Floor activity will show here once it is available.' : 'Choose another filter to see more of your activity.'}</Text>
        </View>
      ) : visibleRows.map(({ row }, index) => (
        <Animated.View key={row.id} entering={FadeInUp.delay(index * 100).springify()} style={[styles.orderCard, { backgroundColor: palette.white, borderColor: palette.offWhite }]}>
          {row.image ? (
            <Image source={{ uri: row.image }} style={[styles.orderImage, { backgroundColor: palette.offWhite }]} contentFit="cover" />
          ) : (
            <View style={[styles.orderImage, { backgroundColor: palette.offWhite }]} />
          )}
          <View style={styles.orderDetails}>
            <Text style={[styles.orderTag, { color: palette.terracotta }]}>{row.status.replaceAll('_', ' ').toUpperCase()}</Text>
            <Text style={[styles.orderTitle, { color: palette.black }]}>{row.title}</Text>
            <Text style={[styles.orderBrand, { color: palette.slate }]}>{row.brand}</Text>
            <Text style={[styles.orderDetail, { color: palette.slate }]}>{row.detail}</Text>
            <View style={styles.orderActions}>
              <Pressable onPress={() => setExpanded(expanded === row.id ? null : row.id)}>
                <Text style={[styles.orderAction, { color: palette.terracotta }]}>{expanded === row.id ? 'Hide details' : 'View details'}</Text>
              </Pressable>
            </View>
            {expanded === row.id ? (
              <Text style={[styles.orderExpanded, { color: palette.slate }]}>{isBoutique ? `Order reference ${row.id}` : `Booking reference ${row.id}`}</Text>
            ) : null}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

function FavoritesPage({
  products,
  onOpenProduct,
  lounge = false,
  swahili = false,
}: {
  products: Product[];
  onOpenProduct: (product: Product) => void;
  lounge?: boolean;
  swahili?: boolean;
}) {
  const palette = lounge ? loungeColors : colors;
  const { width } = useWindowDimensions();
  const cardWidth = (width - space.xl * 2 - space.md) / 2;
  const loungeItems = useLoungeStore((state) => state.items);
  const stylistIds = useFavoritesStore((state) => state.stylistIds);
  const favoriteStylists = useMemo(
    () => loungeItems.filter((stylist) => stylistIds.includes(stylist.id)),
    [loungeItems, stylistIds],
  );
  const hasFavorites = lounge ? favoriteStylists.length > 0 : products.length > 0;
  return (
    <View style={[styles.page, { backgroundColor: palette.white }]}>
      <View style={styles.pageHeading}>
        <Text style={[styles.pageKicker, { color: palette.terracotta }]}>{lounge ? 'YOUR PEOPLE' : 'YOUR EDIT'}</Text>
        <Text style={[styles.pageTitle, { color: palette.black }]}>{swahili ? 'Vipendwa' : lounge ? 'Favorites' : 'Wishlist'}</Text>
        <Text style={[styles.pageSub, { color: palette.slate }]}>{swahili ? 'Vitu na wataalamu uliowahifadhi.' : lounge ? 'Artists and experiences you want to revisit.' : 'Pieces you have saved for later.'}</Text>
      </View>
      {hasFavorites && lounge ? (
        <ScrollView contentContainerStyle={styles.stylistFavorites} showsVerticalScrollIndicator={false}>
        {favoriteStylists.map((stylist) => <StylistCard key={stylist.id} stylist={stylist} lounge />)}
        </ScrollView>
      ) : hasFavorites ? (
        <ScrollView contentContainerStyle={styles.productGrid} showsVerticalScrollIndicator={false}>
          {products.map((product) => (
            <View key={product.id} style={{ width: cardWidth }}>
              <ProductCard product={product} width={cardWidth} onPress={onOpenProduct} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyMark, { color: palette.terracotta }]}>{lounge ? 'FF' : 'FF'}</Text>
          <Text style={[styles.emptyTitle, { color: palette.black }]}>{lounge ? 'Your next favorite artist is waiting.' : 'Your next favorite is waiting.'}</Text>
          <Text style={[styles.pageSub, { color: palette.slate }]}>Save a piece or artist and it will find a home here.</Text>
        </View>
      )}
    </View>
  );
}

function tabTitle(tab: MainTab, swahili: boolean) {
  if (!swahili) return tab;
  const translations: Record<MainTab, string> = {
    Discovery: 'Ugunduzi',
    Wishlist: 'Vipendwa',
    Orders: 'Maagizo',
    Explore: 'Chunguza',
    Favorites: 'Vipendwa',
    Bookings: 'Miadi',
  };
  return translations[tab];
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm, backgroundColor: colors.white, zIndex: 2 },
  menuButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { ...type.label, fontSize: 11, letterSpacing: 2.1, color: colors.black },
  location: { color: colors.slate, fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  iconButton: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerIcon: { color: colors.black, fontSize: 21, fontWeight: '500' },
  notificationDot: { position: 'absolute', top: 7, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.terracotta },
  profileButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.offWhite, marginLeft: 4 },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profileLetter: { color: colors.black, fontSize: 12, fontWeight: '800' },
  profileName: { color: colors.black, fontSize: 10, fontWeight: '700' },
  searchWrap: { marginHorizontal: space.xl, marginTop: space.xs, marginBottom: space.xs, height: 43, borderRadius: radius.pill, backgroundColor: colors.offWhite, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, borderWidth: 1, borderColor: '#ECE4DC' },
  searchFocused: { backgroundColor: colors.white, borderColor: colors.sand, shadowColor: colors.black, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  searchIcon: { color: colors.terracotta, fontSize: 25, marginRight: space.xs, lineHeight: 30 },
  searchInput: { flex: 1, color: colors.black, fontSize: 12, paddingVertical: 0 },
  clearSearch: { color: colors.slate, fontSize: 22, paddingHorizontal: space.xs },
  bottomBar: { position: 'absolute', zIndex: 20, alignSelf: 'center', minHeight: 58, borderRadius: radius.pill, backgroundColor: 'rgba(255,252,248,0.96)', borderWidth: 1, borderColor: 'rgba(223,213,202,0.8)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 5, gap: 4, shadowColor: colors.black, shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 9 },
  tab: { height: 46, minWidth: 48, paddingHorizontal: 13, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  activeTab: { backgroundColor: colors.black, paddingHorizontal: 17 },
  tabIcon: { fontSize: 18, color: colors.slate },
  activeTabText: { color: colors.white },
  tabLabel: { color: colors.white, fontSize: 11, fontWeight: '800' },
  page: { flex: 1, backgroundColor: colors.white },
  pageHeading: { paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.lg },
  pageKicker: { ...type.label, color: colors.terracotta, fontSize: 9 },
  pageTitle: { ...type.display, fontFamily: 'serif', fontSize: 34, lineHeight: 40, marginTop: 5 },
  pageSub: { ...type.body, color: colors.slate, fontSize: 12, lineHeight: 17, marginTop: 5 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.xl, paddingBottom: 130 },
  emptyState: { marginHorizontal: space.xl, marginTop: space.xxl, padding: space.xl, alignItems: 'center', backgroundColor: colors.offWhite, borderRadius: radius.lg },
  emptyMark: { fontFamily: 'serif', color: colors.terracotta, fontSize: 38 },
  emptyTitle: { ...type.title, fontFamily: 'serif', textAlign: 'center', marginTop: space.sm },
  orderContent: { paddingBottom: 130 },
  orderEmpty: { marginHorizontal: space.xl, marginTop: space.md, marginBottom: space.md, minHeight: 140, padding: space.lg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, gap: space.sm },
  saveButton: { minHeight: 38, minWidth: 140, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: space.md, marginTop: space.sm },
  saveButtonText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  stylistFavorites: { paddingHorizontal: space.xl, paddingBottom: 130, gap: space.md },
  orderFilters: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, marginBottom: space.lg },
  orderFilter: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.offWhite, paddingHorizontal: 15, paddingVertical: 8 },
  orderFilterActive: { backgroundColor: colors.black, borderColor: colors.black },
  orderFilterText: { color: colors.slate, fontSize: 11, fontWeight: '700' },
  orderFilterActiveText: { color: colors.white },
  orderCard: { flexDirection: 'row', marginHorizontal: space.xl, marginBottom: space.md, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.offWhite },
  orderImage: { width: 104, minHeight: 170, backgroundColor: colors.offWhite },
  orderDetails: { flex: 1, padding: space.md },
  orderTag: { ...type.label, color: colors.terracotta, fontSize: 8 },
  orderTitle: { ...type.title, fontSize: 16, marginTop: 5 },
  orderBrand: { ...type.body, fontSize: 11, color: colors.slate, marginTop: 2 },
  orderDetail: { ...type.body, fontSize: 10, color: colors.slate, marginTop: space.sm },
  orderActions: { flexDirection: 'row', gap: space.lg, marginTop: space.md },
  orderAction: { color: colors.terracotta, fontSize: 10, fontWeight: '800' },
  orderExpanded: { ...type.body, color: colors.slate, fontSize: 10, lineHeight: 14, marginTop: space.sm },
  receiptNote: { marginHorizontal: space.xl, marginTop: space.md, padding: space.lg, backgroundColor: colors.offWhite, borderRadius: radius.md },
  receiptTitle: { ...type.title, fontSize: 14 },
});
