import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../shared/theme/tokens';
import { BarChart, Card, Heading, Label, NoAccess, Segmented } from '../shared/components/ui';
import { ROLE_META } from '../lib/rbac';
import { useAccess, useStore } from '../store/useStore';

type Range = 'day' | 'week' | 'month' | 'year';
type Bucket = { key: string; label: string; start: number; end: number; value: number };

function createBuckets(range: Range, now: Date): Bucket[] {
  if (range === 'day') {
    const end = new Date(now);
    end.setMinutes(0, 0, 0);
    end.setHours(Math.floor(end.getHours() / 3) * 3 + 3);
    return Array.from({ length: 8 }, (_, index) => {
      const start = new Date(end.getTime() - (8 - index) * 3 * 60 * 60 * 1000);
      return { key: String(start.getTime()), label: start.toLocaleTimeString(undefined, { hour: 'numeric' }), start: start.getTime(), end: start.getTime() + 3 * 60 * 60 * 1000, value: 0 };
    });
  }
  if (range === 'week') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const start = new Date(today.getTime() - (6 - index) * 86_400_000);
      return { key: start.toISOString().slice(0, 10), label: start.toLocaleDateString(undefined, { weekday: 'narrow' }), start: start.getTime(), end: start.getTime() + 86_400_000, value: 0 };
    });
  }
  if (range === 'month') {
    const first = new Date(now);
    first.setHours(0, 0, 0, 0);
    first.setDate(first.getDate() - 29);
    return Array.from({ length: 5 }, (_, index) => {
      const start = new Date(first.getTime() + index * 6 * 86_400_000);
      const end = new Date(start.getTime() + 6 * 86_400_000);
      return { key: String(start.getTime()), label: start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), start: start.getTime(), end: end.getTime(), value: 0 };
    });
  }
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return Array.from({ length: 12 }, (_, index) => {
    const start = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const end = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index + 1, 1);
    return { key: `${start.getFullYear()}-${start.getMonth()}`, label: start.toLocaleDateString(undefined, { month: 'short' }), start: start.getTime(), end: end.getTime(), value: 0 };
  });
}

interface Props {
  goTo: (tab: 'orders' | 'bookings' | 'partners' | 'products') => void;
}

export function OverviewScreen({ goTo }: Props) {
  const { user, role, can, own, scope } = useAccess();
  const orders = useStore((state) => state.orders);
  const bookings = useStore((state) => state.bookings);
  const products = useStore((state) => state.products);
  const services = useStore((state) => state.services);
  const partners = useStore((state) => state.partners);
  const [range, setRange] = useState<Range>('week');
  const myOrders = useMemo(() => own(orders), [orders, scope, user?.partnerId]);
  const myBookings = useMemo(() => own(bookings), [bookings, scope, user?.partnerId]);
  const myProducts = useMemo(() => own(products), [products, scope, user?.partnerId]);
  const myServices = useMemo(() => own(services), [services, scope, user?.partnerId]);

  const activity = useMemo(() => {
    const buckets = createBuckets(range, new Date());
    [...myOrders.map((order) => order.createdAt), ...myBookings.map((booking) => booking.startsAt)].forEach((date) => {
      const timestamp = new Date(date).getTime();
      const bucket = buckets.find((item) => timestamp >= item.start && timestamp < item.end);
      if (bucket) bucket.value += 1;
    });
    return buckets.map(({ label, value }) => ({ label, value }));
  }, [myOrders, myBookings, range]);

  const stockByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    myProducts.forEach((product) => {
      const category = product.category || 'Other';
      totals.set(category, (totals.get(category) ?? 0) + product.stock);
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  }, [myProducts]);

  if (!can('dashboard.view') || !role || !user) return <NoAccess what="the overview" />;

  const pendingPartners = partners.filter((partner) => partner.status === 'pending').length;
  const pendingOrders = myOrders.filter((order) => order.status === 'pending').length;
  const pendingBookings = myBookings.filter((booking) => booking.status === 'pending').length;
  const pendingCatalog = myProducts.filter((product) => product.approvalStatus === 'pending').length
    + myServices.filter((service) => service.approvalStatus === 'pending').length;
  const lowStock = myProducts.filter((product) => product.stock > 0 && product.stock <= 3).length;
  const hasOrders = can('orders.view');
  const hasBookings = can('bookings.view');

  const todo = [
    can('partners.view') && pendingPartners > 0 && { tab: 'partners' as const, text: `${pendingPartners} partners pending review` },
    can('orders.view') && pendingOrders > 0 && { tab: 'orders' as const, text: `${pendingOrders} orders awaiting action` },
    can('bookings.view') && pendingBookings > 0 && { tab: 'bookings' as const, text: `${pendingBookings} appointments to confirm` },
    can('catalog.approve') && pendingCatalog > 0 && { tab: 'products' as const, text: `${pendingCatalog} products and services to review` },
    can('catalog.view') && lowStock > 0 && { tab: 'products' as const, text: `${lowStock} products with low stock` },
  ].filter(Boolean) as { tab: 'orders' | 'bookings' | 'partners' | 'products'; text: string }[];

  return (
    <View style={styles.wrap}>
      <Heading
        title={`Hello, ${user.name.split(' ')[0]}`}
        subtitle={`${ROLE_META[role].label} · ${scope === 'own' ? 'your business' : 'Fashion Floor'}`}
      />

      <View style={styles.grid}>
        {hasOrders ? <Card style={styles.kpi}><Label>Orders</Label><Text style={styles.kpiValue}>{myOrders.length}</Text></Card> : null}
        {hasBookings ? <Card style={styles.kpi}><Label>Appointments</Label><Text style={styles.kpiValue}>{myBookings.length}</Text></Card> : null}
        {can('catalog.view') ? <Card style={styles.kpi}><Label>Products</Label><Text style={styles.kpiValue}>{myProducts.length}</Text><Text style={styles.hint}>{pendingCatalog} waiting for review</Text></Card> : null}
        {can('partners.view') && scope === 'all' ? (
          <Card style={styles.kpi}><Label>Active partners</Label><Text style={styles.kpiValue}>{partners.filter((partner) => partner.status === 'approved').length}</Text></Card>
        ) : null}
      </View>

      <Card style={{ gap: 12 }}>
        <Text style={type.title}>Platform activity</Text>
        <Text style={styles.hint}>Orders and appointments in the selected period.</Text>
        <Segmented<Range>
          value={range}
          onChange={setRange}
          items={[
            { value: 'day', label: 'Today' },
            { value: 'week', label: '7 days' },
            { value: 'month', label: '30 days' },
            { value: 'year', label: '12 months' },
          ]}
        />
        <BarChart data={activity} format={(count) => String(count)} />
      </Card>

      {can('catalog.view') ? (
        <Card style={{ gap: 12 }}>
          <Text style={type.title}>Stock by category</Text>
          <Text style={styles.hint}>Recorded quantities from the live catalog.</Text>
          {stockByCategory.length
            ? <BarChart data={stockByCategory} format={(count) => String(count)} />
            : <Text style={[type.body, { color: colors.slate }]}>Stock charts will appear when products are added.</Text>}
        </Card>
      ) : null}

      <Card style={{ gap: 10 }}>
        <Text style={type.title}>Needs your attention</Text>
        {todo.length === 0 ? (
          <Text style={[type.body, { color: colors.slate }]}>No pending items in the data available to your role.</Text>
        ) : (
          todo.map((item) => (
            <Text key={item.text} onPress={() => goTo(item.tab)} style={styles.todo} accessibilityRole="button">
              {item.text}  →
            </Text>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  kpi: { flexGrow: 1, flexBasis: '45%', gap: 8 },
  kpiValue: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, color: colors.espresso },
  hint: { fontSize: 12, color: colors.slate },
  todo: { fontSize: 14, fontWeight: '700', color: colors.espresso, backgroundColor: colors.cream, padding: 14, borderRadius: 16, overflow: 'hidden' },
});
