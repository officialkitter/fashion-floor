'use client';

import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Card, NoAccess, PageHeader, StatusBadge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { money } from '@/lib/utils';

type ReportRange = 'day' | 'week' | 'month' | 'year' | 'all';
const RANGE_LABELS: Record<ReportRange, string> = {
  day: 'Today',
  week: 'Last 7 days',
  month: 'Last 30 days',
  year: 'Last 12 months',
  all: 'All available records',
};

function rangeStart(range: ReportRange, now: Date) {
  const start = new Date(now);
  if (range === 'day') start.setHours(0, 0, 0, 0);
  if (range === 'week') start.setDate(start.getDate() - 6);
  if (range === 'month') start.setDate(start.getDate() - 29);
  if (range === 'year') {
    start.setMonth(start.getMonth() - 11, 1);
    start.setHours(0, 0, 0, 0);
  }
  return range === 'all' ? Number.NEGATIVE_INFINITY : start.getTime();
}

function inRange(date: string, start: number, end: number) {
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
}

export default function ReportsPage() {
  const { role, can, own } = useAccess();
  const { orders, bookings, products, partners, dataLoading, queryErrors } = useStore();
  const [range, setRange] = useState<ReportRange>('month');
  const now = useMemo(() => new Date(), [orders, bookings, products, partners]);
  const start = rangeStart(range, now);
  const end = now.getTime();

  const visibleOrders = own(orders).filter((order) => inRange(order.createdAt, start, end));
  const visibleBookings = own(bookings).filter((booking) => inRange(booking.startsAt, start, end));
  const visibleProducts = own(products);
  const activeOrders = visibleOrders.filter((order) => order.status !== 'cancelled');
  const activeBookings = visibleBookings.filter((booking) => booking.status !== 'cancelled');
  const totals = new Map<string, number>();
  [...activeOrders.map((order) => ({ amount: order.total, currency: order.currency })),
    ...activeBookings.map((booking) => ({ amount: booking.price, currency: booking.currency }))]
    .forEach(({ amount, currency }) => totals.set(currency, (totals.get(currency) ?? 0) + amount));
  const inventoryValue = visibleProducts.reduce((sum, product) => sum + product.stock * product.price, 0);
  const pendingProducts = visibleProducts.filter((product) => product.approvalStatus === 'pending');
  const lowStock = visibleProducts.filter((product) => product.stock > 0 && product.stock <= 3);
  const outOfStock = visibleProducts.filter((product) => product.stock <= 0);

  if (!role || !can('dashboard.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="reports" />;

  return (
    <div className="print-report">
      <PageHeader
        title="Business reports"
        subtitle="Review orders, appointments, inventory, and partner activity. Printed reports use the selected period and your account’s access scope."
        action={<Button className="no-print" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print report</Button>}
      />
      <div className="no-print mb-5 flex flex-wrap gap-2" aria-label="Report period">
        {(Object.keys(RANGE_LABELS) as ReportRange[]).map((key) => (
          <button key={key} type="button" aria-pressed={range === key} onClick={() => setRange(key)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${range === key ? 'bg-coffee text-white' : 'bg-white text-coffee ring-1 ring-coffee/10 hover:ring-coffee/40'}`}>{RANGE_LABELS[key]}</button>
        ))}
      </div>
      <p className="mb-4 text-xs text-stone">Period: {range === 'all' ? 'All available records' : `${new Date(start).toLocaleDateString()} – ${now.toLocaleDateString()}`} · Generated {now.toLocaleString()}</p>

      {Object.values(queryErrors).some(Boolean) ? <p role="alert" className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Some sections may be incomplete because one or more data sources could not be loaded. See the overview for details.</p> : null}
      {dataLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading the latest records…</p> : null}

      {can('finance.view') ? (
        <section className="mb-5">
          <h2 className="mb-3 text-lg font-bold text-coffee">Recorded value</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card><p className="text-sm text-stone">Orders</p><p className="mt-1 text-2xl font-extrabold text-coffee">{activeOrders.length}</p></Card>
            <Card><p className="text-sm text-stone">Appointments</p><p className="mt-1 text-2xl font-extrabold text-coffee">{activeBookings.length}</p></Card>
            <Card><p className="text-sm text-stone">Recorded order and booking value</p><p className="mt-1 text-xl font-extrabold text-coffee">{[...totals].map(([currency, amount]) => money(amount, currency)).join(' · ') || money(0)}</p><p className="mt-1 text-xs text-stone">Cancelled records excluded</p></Card>
            <Card><p className="text-sm text-stone">Inventory retail value</p><p className="mt-1 text-xl font-extrabold text-coffee">{money(inventoryValue)}</p><p className="mt-1 text-xs text-stone">Based on current on-hand stock</p></Card>
          </div>
        </section>
      ) : null}

      {can('orders.view') ? <section className="mb-5 break-inside-avoid">
        <h2 className="mb-3 text-lg font-bold text-coffee">Orders ({visibleOrders.length})</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-wide text-stone"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Store</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-stone/10">{visibleOrders.slice(0, 200).map((order) => <tr key={order.id}>
              <td className="px-4 py-3 font-semibold text-coffee">{order.id.slice(0, 8)}</td><td className="px-4 py-3">{order.vendorName || 'Fashion Floor Point'}</td><td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString()}</td><td className="px-4 py-3">{order.items.reduce((sum, item) => sum + item.qty, 0)}</td><td className="px-4 py-3">{money(order.total, order.currency)}</td><td className="px-4 py-3"><StatusBadge status={order.status} /></td>
            </tr>)}</tbody>
          </table>
          {visibleOrders.length > 200 ? <p className="px-4 py-2 text-xs text-stone">Showing 200 of {visibleOrders.length} orders.</p> : null}
        </Card>
      </section> : null}

      {can('bookings.view') ? <section className="mb-5 break-inside-avoid">
        <h2 className="mb-3 text-lg font-bold text-coffee">Appointments ({visibleBookings.length})</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-wide text-stone"><tr><th className="px-4 py-3">Appointment</th><th className="px-4 py-3">Service location</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-stone/10">{visibleBookings.slice(0, 200).map((booking) => <tr key={booking.id}>
              <td className="px-4 py-3 font-semibold text-coffee">{booking.id.slice(0, 8)}</td><td className="px-4 py-3">{booking.businessName}</td><td className="px-4 py-3">{booking.service}</td><td className="px-4 py-3">{new Date(booking.startsAt).toLocaleString()}</td><td className="px-4 py-3">{money(booking.price, booking.currency)}</td><td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
            </tr>)}</tbody>
          </table>
          {visibleBookings.length > 200 ? <p className="px-4 py-2 text-xs text-stone">Showing 200 of {visibleBookings.length} appointments.</p> : null}
        </Card>
      </section> : null}

      {can('catalog.view') ? <section className="mb-5 break-inside-avoid">
        <h2 className="mb-3 text-lg font-bold text-coffee">Inventory ({visibleProducts.length} products)</h2>
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <Card><p className="text-sm text-stone">Awaiting product review</p><p className="mt-1 text-xl font-extrabold text-amber-800">{pendingProducts.length}</p></Card>
          <Card><p className="text-sm text-stone">Low stock (1–3)</p><p className="mt-1 text-xl font-extrabold text-amber-800">{lowStock.length}</p></Card>
          <Card><p className="text-sm text-stone">Out of stock</p><p className="mt-1 text-xl font-extrabold text-red-800">{outOfStock.length}</p></Card>
        </div>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-wide text-stone"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Brand</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Store</th><th className="px-4 py-3">On hand</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Review status</th></tr></thead>
            <tbody className="divide-y divide-stone/10">{visibleProducts.slice(0, 300).map((product) => <tr key={product.id}>
              <td className="px-4 py-3 font-semibold text-coffee">{product.title}</td><td className="px-4 py-3">{product.brandName}</td><td className="px-4 py-3">{product.category}</td><td className="px-4 py-3">{product.storeName}</td><td className="px-4 py-3">{product.stock}</td><td className="px-4 py-3">{money(product.price, product.currency)}</td><td className="px-4 py-3"><StatusBadge status={product.approvalStatus} /></td>
            </tr>)}</tbody>
          </table>
          {visibleProducts.length > 300 ? <p className="px-4 py-2 text-xs text-stone">Showing 300 of {visibleProducts.length} products.</p> : null}
        </Card>
      </section> : null}

      {can('partners.view') ? <section className="mb-5 break-inside-avoid">
        <h2 className="mb-3 text-lg font-bold text-coffee">Partners ({partners.length})</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="bg-cream text-xs uppercase tracking-wide text-stone"><tr><th className="px-4 py-3">Partner</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-stone/10">{partners.slice(0, 200).map((partner) => <tr key={partner.id}>
              <td className="px-4 py-3 font-semibold text-coffee">{partner.name}</td><td className="px-4 py-3">{partner.type}</td><td className="px-4 py-3">{partner.city || '—'}</td><td className="px-4 py-3"><StatusBadge status={partner.status} /></td>
            </tr>)}</tbody>
          </table>
        </Card>
      </section> : null}
    </div>
  );
}
