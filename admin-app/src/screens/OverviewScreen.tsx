import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../shared/theme/tokens';
import { BarChart, Card, Heading, Label, NoAccess } from '../shared/components/ui';
import { ROLE_META } from '../lib/rbac';
import { useAccess, useStore } from '../store/useStore';

const DAY = 86_400_000;

interface Props {
  goTo: (tab: 'orders' | 'bookings' | 'partners' | 'products') => void;
}

export function OverviewScreen({ goTo }: Props) {
  const { user, role, can, own, scope } = useAccess();
  const orders = useStore((state) => state.orders);
  const bookings = useStore((state) => state.bookings);
  const products = useStore((state) => state.products);
  const partners = useStore((state) => state.partners);
  const myOrders = own(orders);
  const myBookings = own(bookings);
  const myProducts = own(products);

  const activity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(Date.now() - (6 - index) * DAY);
      return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString(undefined, { weekday: 'narrow' }), value: 0 };
    });
    [...myOrders.map((order) => order.createdAt), ...myBookings.map((booking) => booking.startsAt)].forEach((date) => {
      const bucket = days.find((item) => item.key === date.slice(0, 10));
      if (bucket) bucket.value += 1;
    });
    return days;
  }, [myOrders, myBookings]);

  if (!can('dashboard.view') || !role || !user) return <NoAccess what="the overview" />;

  const pendingPartners = partners.filter((partner) => partner.status === 'pending').length;
  const pendingOrders = myOrders.filter((order) => order.status === 'pending').length;
  const pendingBookings = myBookings.filter((booking) => booking.status === 'pending').length;
  const lowStock = myProducts.filter((product) => product.stock <= 3).length;
  const hasOrders = can('orders.view');
  const hasBookings = can('bookings.view');

  const todo = [
    can('partners.view') && pendingPartners > 0 && { tab: 'partners' as const, text: `${pendingPartners} partners pending review` },
    can('orders.view') && pendingOrders > 0 && { tab: 'orders' as const, text: `${pendingOrders} orders awaiting action` },
    can('bookings.view') && pendingBookings > 0 && { tab: 'bookings' as const, text: `${pendingBookings} appointments to confirm` },
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
        {can('catalog.view') ? <Card style={styles.kpi}><Label>Products</Label><Text style={styles.kpiValue}>{myProducts.length}</Text></Card> : null}
        {can('partners.view') && scope === 'all' ? (
          <Card style={styles.kpi}><Label>Active partners</Label><Text style={styles.kpiValue}>{partners.filter((partner) => partner.status === 'approved').length}</Text></Card>
        ) : null}
      </View>

      <Card style={{ gap: 12 }}>
        <Text style={type.title}>Platform activity · last 7 days</Text>
        <Text style={styles.hint}>Orders and appointments recorded in live data.</Text>
        <BarChart data={activity} format={(count) => String(count)} />
      </Card>

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
