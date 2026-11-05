'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2, Package, ShoppingBag, Store } from 'lucide-react';
import { Card, EmptyState, Img, NoAccess, PageHeader } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { money } from '@/lib/utils';

type Range = 'day' | 'week' | 'month' | 'year';
type Bucket = { key: string; label: string; start: number; end: number; count: number };

function createBuckets(range: Range, now: Date): Bucket[] {
  if (range === 'day') {
    const end = new Date(now);
    end.setMinutes(0, 0, 0);
    end.setHours(Math.floor(end.getHours() / 2) * 2 + 2);
    return Array.from({ length: 12 }, (_, index) => {
      const start = new Date(end.getTime() - (12 - index) * 2 * 60 * 60 * 1000);
      return { key: String(start.getTime()), label: start.toLocaleTimeString(undefined, { hour: 'numeric' }), start: start.getTime(), end: start.getTime() + 2 * 60 * 60 * 1000, count: 0 };
    });
  }
  if (range === 'week') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const start = new Date(today.getTime() - (6 - index) * 24 * 60 * 60 * 1000);
      return { key: start.toISOString().slice(0, 10), label: start.toLocaleDateString(undefined, { weekday: 'short' }), start: start.getTime(), end: start.getTime() + 24 * 60 * 60 * 1000, count: 0 };
    });
  }
  if (range === 'month') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    return Array.from({ length: 5 }, (_, index) => {
      const bucketStart = new Date(start.getTime() + index * 6 * 24 * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      return { key: String(bucketStart.getTime()), label: bucketStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), start: bucketStart.getTime(), end: bucketEnd.getTime(), count: 0 };
    });
  }
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return Array.from({ length: 12 }, (_, index) => {
    const start = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const end = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index + 1, 1);
    return { key: `${start.getFullYear()}-${start.getMonth()}`, label: start.toLocaleDateString(undefined, { month: 'short' }), start: start.getTime(), end: end.getTime(), count: 0 };
  });
}

export default function DashboardPage() {
  const { user, role, can, own } = useAccess();
  const { orders, bookings, products, partners, queryErrors, dataLoading } = useStore();
  const [range, setRange] = useState<Range>('week');
  const now = useMemo(() => new Date(), [orders, bookings, products, partners]);
  if (!role || !user || !can('dashboard.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="the overview" />;

  const visibleOrders = own(orders);
  const visibleBookings = own(bookings);
  const visibleProducts = own(products);
  const buckets = createBuckets(range, now);
  const inRange = (value: string) => {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) && timestamp >= buckets[0].start && timestamp < buckets[buckets.length - 1].end;
  };
  [...visibleOrders.filter((item) => inRange(item.createdAt)), ...visibleBookings.filter((item) => inRange(item.startsAt))]
    .forEach((item) => {
      const timestamp = new Date('createdAt' in item ? item.createdAt : item.startsAt).getTime();
      const bucket = buckets.find((candidate) => timestamp >= candidate.start && timestamp < candidate.end);
      if (bucket) bucket.count += 1;
    });

  const rangeOrders = visibleOrders.filter((order) => order.status !== 'cancelled' && inRange(order.createdAt));
  const rangeBookings = visibleBookings.filter((booking) => booking.status !== 'cancelled' && inRange(booking.startsAt));
  const totalsByCurrency = new Map<string, number>();
  [...rangeOrders.map((item) => ({ amount: item.total, currency: item.currency })), ...rangeBookings.map((item) => ({ amount: item.price, currency: item.currency }))]
    .forEach(({ amount, currency }) => totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + amount));
  const pendingProducts = visibleProducts.filter((product) => product.approvalStatus === 'pending');
  const lowStock = visibleProducts.filter((product) => product.stock > 0 && product.stock <= 3).length;
  const outOfStock = visibleProducts.filter((product) => product.stock === 0).length;
  const categoryStock = [...visibleProducts.reduce((map, product) => {
    const entry = map.get(product.category) ?? { products: 0, stock: 0 };
    entry.products += 1;
    entry.stock += product.stock;
    map.set(product.category, entry);
    return map;
  }, new Map<string, { products: number; stock: number }>()).entries()]
    .sort((a, b) => b[1].products - a[1].products)
    .slice(0, 6);
  const maxActivity = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const cards = [
    can('orders.view') ? { icon: ShoppingBag, label: 'Orders', value: visibleOrders.length, note: `${rangeOrders.length} in this period`, tint: 'bg-mist text-coffee', error: queryErrors.orders } : null,
    can('bookings.view') ? { icon: CalendarDays, label: 'Appointments', value: visibleBookings.length, note: `${rangeBookings.length} in this period`, tint: 'bg-sky-50 text-sky-800', error: queryErrors.bookings } : null,
    can('catalog.view') ? { icon: Package, label: 'Products', value: visibleProducts.length, note: `${lowStock} low · ${outOfStock} out of stock`, tint: 'bg-amber-50 text-amber-800', error: queryErrors.products } : null,
    can('partners.view') ? { icon: Store, label: 'Partners', value: partners.length, note: `${partners.filter((item) => item.status === 'approved').length} approved`, tint: 'bg-emerald-50 text-emerald-800', error: queryErrors.partners } : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card));
  const featuredProducts = visibleProducts.filter((product) => product.images[0]).slice(0, 3);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle={`Fashion Floor · ${ROLE_LABELS[role]} · Live operations`} />
      {can('finance.view') ? (
        <Card className="mb-5 overflow-hidden bg-coffee text-white">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-white/75">Recorded order and appointment value</p>
              <p className="mt-2 text-3xl font-extrabold">{dataLoading ? 'Loading…' : [...totalsByCurrency].map(([currency, amount]) => money(amount, currency)).join(' · ') || money(0)}</p>
              <p className="mt-1 text-xs text-white/70">Cancelled records excluded · {rangeOrders.length} orders and {rangeBookings.length} appointments in this period</p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Analytics date range">
              {([['day', 'Today'], ['week', '7 days'], ['month', '30 days'], ['year', '12 months']] as const).map(([key, label]) => (
                <button key={key} type="button" aria-pressed={range === key} onClick={() => setRange(key)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${range === key ? 'bg-white text-coffee' : 'bg-white/10 text-white hover:bg-white/20'}`}>{label}</button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Analytics date range">
          {([['day', 'Today'], ['week', '7 days'], ['month', '30 days'], ['year', '12 months']] as const).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={range === key} onClick={() => setRange(key)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${range === key ? 'bg-coffee text-white' : 'bg-white text-stone hover:bg-mist'}`}>{label}</button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, note, tint, error }) => (
          <Card key={label}>
            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-stone">{label}</span><span className={`rounded-2xl p-2 ${tint}`}><Icon size={18} aria-hidden="true" /></span></div>
            {error ? <p role="alert" className="mt-3 text-sm text-red-800">Could not load: {error}</p> : <><p className="mt-3 text-3xl font-extrabold text-coffee">{dataLoading ? '…' : value}</p><p className="mt-1 text-xs text-stone">{note}</p></>}
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-extrabold text-coffee">Activity trend</h2><p className="mt-1 text-sm text-stone">Orders and appointments created in the selected period</p></div>
            <span className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-stone">{buckets.reduce((sum, item) => sum + item.count, 0)} records</span>
          </div>
          <div className="mt-7 flex h-52 items-end gap-2 sm:gap-3" role="img" aria-label={`Activity trend for ${range}`}>
            {buckets.map((bucket) => (
              <div key={bucket.key} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-bold text-stone opacity-0 group-hover:opacity-100">{bucket.count}</span>
                <div title={`${bucket.label}: ${bucket.count} records`} className="w-full rounded-t-xl bg-caramel transition-[height] duration-500 group-hover:bg-coffee" style={{ height: `${Math.max(4, bucket.count / maxActivity * 78)}%` }} />
                <span className="w-full truncate text-center text-[10px] font-semibold text-stone">{bucket.label}</span>
              </div>
            ))}
          </div>
          <ul className="sr-only">{buckets.map((item) => <li key={item.key}>{item.label}: {item.count} records</li>)}</ul>
        </Card>

        {can('catalog.approve') ? (
          <Card>
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold text-coffee">Product review queue</h2><p className="mt-1 text-sm text-stone">New and updated listings stay hidden until approved.</p></div><CheckCircle2 className="text-amber-700" size={20} aria-hidden="true" /></div>
            <p className="mt-5 text-4xl font-extrabold text-coffee">{pendingProducts.length}</p>
            <p className="mt-1 text-sm text-stone">Products waiting for review</p>
            {pendingProducts.slice(0, 3).map((product) => <div key={product.id} className="mt-4 flex items-center gap-3 border-t border-coffee/10 pt-3">
              {product.images[0] ? <Img src={product.images[0]} alt="" className="h-12 w-12 rounded-xl" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mist"><Package size={18} className="text-stone" aria-hidden="true" /></div>}
              <div className="min-w-0"><p className="truncate text-sm font-bold text-coffee">{product.title}</p><p className="text-xs text-stone">{product.brandName} · {product.storeName}</p></div>
              {product.images.length && product.description.trim() && product.stock > 0 ? <ArrowUpRight size={16} className="ml-auto shrink-0 text-emerald-700" aria-label="Ready for review" /> : <ArrowDownRight size={16} className="ml-auto shrink-0 text-amber-700" aria-label="Needs product details" />}
            </div>)}
            {!pendingProducts.length ? <p className="mt-4 rounded-2xl bg-mist p-3 text-sm text-stone">No products need review right now.</p> : null}
            {queryErrors.products ? <p role="alert" className="mt-3 text-sm text-red-800">Could not load the review queue: {queryErrors.products}</p> : null}
          </Card>
        ) : (
          <Card>
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold text-coffee">Inventory health</h2><p className="mt-1 text-sm text-stone">Products and quantities across your available store records</p></div><Package className="text-coffee" size={20} aria-hidden="true" /></div>
            {categoryStock.length ? <div className="mt-5 space-y-4">{categoryStock.map(([category, values]) => {
              const maxProducts = Math.max(1, ...categoryStock.map(([, item]) => item.products));
              return <div key={category}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate font-semibold text-coffee">{category}</span><span className="shrink-0 text-stone">{values.products} products · {values.stock} units</span></div><div className="h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-caramel" style={{ width: `${values.products / maxProducts * 100}%` }} /></div></div>;
            })}</div> : <EmptyState title="Inventory will appear here" hint="Stock analytics populate as approved products are added." />}
          </Card>
        )}
      </div>

      {can('finance.view') ? (
        <Card className="mt-5">
          <h2 className="text-lg font-extrabold text-coffee">Inventory by category</h2>
          <p className="mt-1 text-sm text-stone">Published and submitted product counts with recorded stock</p>
          {categoryStock.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categoryStock.map(([category, values]) => <div key={category} className="rounded-2xl bg-mist p-4"><div className="flex items-center justify-between text-sm font-bold text-coffee"><span>{category}</span><Package size={16} aria-hidden="true" /></div><p className="mt-2 text-2xl font-extrabold">{values.products}</p><p className="text-xs text-stone">{values.stock} units recorded</p></div>)}
          </div> : <EmptyState title="No inventory to chart yet" hint="Category analytics will appear when products are added." />}
        </Card>
      ) : null}

      {featuredProducts.length ? (
        <section className="mt-5">
          <h2 className="mb-3 text-lg font-extrabold text-coffee">Recently listed</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {featuredProducts.map((product) => <article key={product.id} className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-black/5">
              <Img src={product.images[0]} alt={product.title} className="h-40 w-full" />
              <div className="p-4"><p className="truncate font-bold text-coffee">{product.title}</p><p className="mt-1 truncate text-sm text-stone">{product.brandName} · {product.storeName}</p><p className="mt-3 text-xs font-semibold text-stone">{product.stock} in stock</p></div>
            </article>)}
          </div>
        </section>
      ) : null}

      {cards.length === 0 ? <EmptyState title="No dashboard data available" hint="Your database role does not currently have access to these sections." /> : null}
    </>
  );
}
