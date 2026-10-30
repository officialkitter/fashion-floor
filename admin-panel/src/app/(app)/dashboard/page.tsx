'use client';

import { CalendarDays, Package, ShoppingBag, Store } from 'lucide-react';
import { Card, EmptyState, NoAccess, PageHeader } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { money } from '@/lib/utils';

export default function DashboardPage() {
  const { user, role, can, own } = useAccess();
  const { orders, bookings, products, partners, queryErrors, dataLoading } = useStore();
  if (!role || !user || !can('dashboard.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="the overview" />;

  const visibleOrders = own(orders);
  const visibleBookings = own(bookings);
  const visibleProducts = own(products);
  const values = new Map<string, number>();
  visibleOrders.filter((order) => order.status !== 'cancelled').forEach((order) => values.set(order.currency, (values.get(order.currency) ?? 0) + order.total));
  visibleBookings.filter((booking) => booking.status !== 'cancelled').forEach((booking) => values.set(booking.currency, (values.get(booking.currency) ?? 0) + booking.price));
  const cards = [
    can('orders.view') ? { icon: ShoppingBag, label: 'Orders', value: String(visibleOrders.length), error: queryErrors.orders } : null,
    can('bookings.view') ? { icon: CalendarDays, label: 'Appointments', value: String(visibleBookings.length), error: queryErrors.bookings } : null,
    can('catalog.view') ? { icon: Package, label: 'Products', value: String(visibleProducts.length), error: queryErrors.products } : null,
    can('partners.view') ? { icon: Store, label: 'Suppliers & providers', value: String(partners.length), error: queryErrors.partners } : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card));

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle={`Fashion Floor · ${ROLE_LABELS[role]}`} />
      {can('finance.view') ? (
        <Card className="mb-5 bg-lounge text-white">
          <p className="text-sm font-semibold text-white/75">Recorded order and appointment value</p>
          <p className="mt-2 text-3xl font-extrabold">{dataLoading ? 'Loading…' : [...values].map(([currency, amount]) => money(amount, currency)).join(' · ') || money(0)}</p>
          <p className="mt-1 text-xs text-white/70">Cancelled records excluded. Totals are shown separately by currency.</p>
        </Card>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, error }) => (
          <Card key={label}>
            <div className="flex items-center justify-between text-stone"><span className="text-xs font-bold uppercase tracking-wider">{label}</span><Icon size={18} aria-hidden="true" /></div>
            {error ? <p role="alert" className="mt-3 text-sm text-red-800">Could not load: {error}</p> : <p className="mt-3 text-3xl font-extrabold text-coffee">{dataLoading ? '…' : value}</p>}
          </Card>
        ))}
      </div>
      {cards.length === 0 ? <EmptyState title="No dashboard data available" hint="Your database role does not currently have access to these sections." /> : null}
    </>
  );
}
