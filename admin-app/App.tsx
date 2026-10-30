import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingsScreen } from './src/screens/BookingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { OverviewScreen } from './src/screens/OverviewScreen';
import { PartnersScreen } from './src/screens/PartnersScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { ROLE_META, type Permission } from './src/lib/rbac';
import { BottomSheet } from './src/shared/components/BottomSheet';
import { PrimaryButton } from './src/shared/components/PrimaryButton';
import { PressableScale } from './src/shared/components/PressableScale';
import { ToastHost } from './src/shared/components/ToastHost';
import { Avatar } from './src/shared/components/ui';
import { colors, radius, space, springs, type } from './src/shared/theme/tokens';
import { useAccess, useStore } from './src/store/useStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Tab = 'home' | 'orders' | 'bookings' | 'partners' | 'products';
const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; perm: Permission }[] = [
  { key: 'home', label: 'Overview', icon: 'view-dashboard-outline', perm: 'dashboard.view' },
  { key: 'orders', label: 'Orders', icon: 'package-variant-closed', perm: 'orders.view' },
  { key: 'products', label: 'Products', icon: 'tshirt-crew-outline', perm: 'catalog.view' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-clock-outline', perm: 'bookings.view' },
  { key: 'partners', label: 'Partners', icon: 'storefront-outline', perm: 'partners.view' },
];

function TabBar({ tabs, active, onChange, reducedMotion }: { tabs: typeof TABS; active: Tab; onChange: (tab: Tab) => void; reducedMotion: boolean }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((tab) => tab.key === active));
  const itemWidth = width / Math.max(1, tabs.length);
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = reducedMotion ? index * itemWidth : withSpring(index * itemWidth, springs.page);
  }, [index, itemWidth, reducedMotion, x]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.tabWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.tabBar} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? <Animated.View style={[styles.tabPill, { width: itemWidth }, pillStyle]} /> : null}
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <PressableScale
              key={tab.key}
              style={styles.tabItem}
              pressedScale={0.96}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
            >
              <MaterialCommunityIcons name={tab.icon} size={21} color={selected ? colors.espresso : colors.slate} />
              <Text style={[styles.tabLabel, { color: selected ? colors.espresso : colors.slate }]}>{tab.label}</Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const { user, role, can } = useAccess();
  const signOut = useStore((state) => state.signOut);
  const refresh = useStore((state) => state.refresh);
  const refreshing = useStore((state) => state.refreshing);
  const error = useStore((state) => state.error);
  const [tab, setTab] = useState<Tab>('home');
  const [accountOpen, setAccountOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const tabs = TABS.filter((item) => can(item.perm));
  const active = tabs.some((item) => item.key === tab) ? tab : tabs[0]?.key ?? 'home';

  if (!user || !role) {
    return (
      <View style={[styles.blocked, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.blockedTitle}>Account access unavailable</Text>
        <Text style={styles.blockedMessage}>{error ?? 'Your Fashion Floor profile or role could not be loaded.'}</Text>
        <PrimaryButton label="Sign out" onPress={() => void signOut()} />
      </View>
    );
  }

  return (
    <View style={styles.main}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.logo}>FASHION FLOOR</Text>
        <PressableScale onPress={() => setAccountOpen(true)} accessibilityRole="button" accessibilityLabel="Your account">
          <Avatar uri={user.avatar} size={40} />
        </PressableScale>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.caramel} colors={[colors.caramel]} />}
      >
        {error ? <Text style={styles.dataError} accessibilityRole="alert">{error}</Text> : null}
        <Animated.View key={active} entering={reducedMotion ? undefined : FadeIn.duration(220)} exiting={reducedMotion ? undefined : FadeOut.duration(100)}>
          {active === 'home' ? <OverviewScreen goTo={setTab} /> : null}
          {active === 'orders' ? <OrdersScreen /> : null}
          {active === 'bookings' ? <BookingsScreen /> : null}
          {active === 'partners' ? <PartnersScreen /> : null}
          {active === 'products' ? <ProductsScreen /> : null}
        </Animated.View>
      </ScrollView>

      <TabBar tabs={tabs} active={active} onChange={setTab} reducedMotion={reducedMotion} />
      <ToastHost />

      <BottomSheet visible={accountOpen} onClose={() => setAccountOpen(false)}>
        <View style={styles.meRow}>
          <Avatar uri={user.avatar} size={60} />
          <View style={{ flex: 1 }}>
            <Text style={type.title}>{user.name}</Text>
            <Text style={styles.meta}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.accountBox}>
          <Text style={type.title}>{ROLE_META[role].label}</Text>
          <Text style={styles.meta}>Your available screens and data are determined by your account role and server access policies.</Text>
        </View>
        <PrimaryButton
          variant="secondary"
          label="Sign out"
          onPress={() => {
            setAccountOpen(false);
            void signOut();
          }}
        />
      </BottomSheet>
    </View>
  );
}

function Root() {
  const userId = useStore((state) => state.userId);
  const authReady = useStore((state) => state.authReady);
  const start = useStore((state) => state.start);
  useEffect(() => {
    const stop = start();
    SplashScreen.hideAsync().catch(() => {});
    return stop;
  }, [start]);
  if (!authReady) {
    return <View style={styles.loading}><ActivityIndicator color={colors.caramel} /></View>;
  }
  return userId ? <Main /> : <LoginScreen />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.espresso }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Root />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: colors.espresso },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingBottom: 14, maxWidth: 820, width: '100%', alignSelf: 'center' },
  logo: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  content: { padding: space.xl, paddingBottom: 40, width: '100%', maxWidth: 820, alignSelf: 'center' },
  tabWrap: { backgroundColor: colors.white, paddingHorizontal: 10, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cream },
  tabBar: { flexDirection: 'row', height: 58, width: '100%', maxWidth: 820, alignSelf: 'center' },
  tabPill: { position: 'absolute', top: 2, bottom: 2, borderRadius: radius.lg, backgroundColor: colors.cream },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  meRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  meta: { fontSize: 13, lineHeight: 19, color: colors.slate },
  accountBox: { backgroundColor: colors.offWhite, borderRadius: radius.lg, padding: space.lg, gap: 8 },
  blocked: { flex: 1, justifyContent: 'center', gap: 18, backgroundColor: colors.espresso, paddingHorizontal: space.xl },
  blockedTitle: { ...type.title, color: colors.white },
  blockedMessage: { ...type.body, color: colors.cream },
  dataError: { color: colors.danger, backgroundColor: '#FFF0ED', borderRadius: radius.md, padding: 12, marginBottom: 16, fontSize: 13, lineHeight: 18 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.espresso },
});
