'use client';

import { useState } from 'react';
import { Button, EmptyState, NoAccess, PageHeader, StatusBadge, useToast } from '@/components/ui';
import type { OrderStatus } from '@/lib/data';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { dayLabel, maskEmail, money } from '@/lib/utils';

export default function OrdersPage() {
  const toast = useToast();
  const { role, can, own, scope } = useAccess();
  const { orders, queryErrors, dataLoading, setOrderStatus } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  if (!role || !can('orders.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="orders" />;
  const list = own(orders);
  const update = async (id: string, status: OrderStatus) => {
    setBusy(id);
    try {
      await setOrderStatus(id, status);
      toast('Order status saved.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Order update failed.', 'bad');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Live orders from Fashion Floor. Payment status is controlled by the payment provider." />
      {queryErrors.orders ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load orders: {queryErrors.orders}</p> : null}
      {dataLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading the latest orders…</p> : null}
      {!dataLoading && !queryErrors.orders && !list.length ? <EmptyState title="No orders yet" hint="Orders will appear here when the database has records for your account." /> : null}
      <div className="space-y-3">
        {list.map((order) => (
          <article key={order.id} className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-coffee">{order.items[0]?.title ?? 'Order'} <span className="font-normal text-stone">· {order.items.length} item{order.items.length === 1 ? '' : 's'}</span></h2>
                <p className="mt-1 text-sm text-stone">{order.id} · {dayLabel(order.createdAt)} · {order.customer.name}</p>
                <p className="mt-1 text-xs text-stone">{scope === 'own' ? maskEmail(order.customer.email) : order.customer.email} {scope === 'all' && order.vendorName ? `· ${order.vendorName}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <strong className="text-coffee">{money(order.total, order.currency)}</strong>
                <StatusBadge status={order.status} />
              </div>
            </div>
            {order.items.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {order.items.map((item) => <li key={item.id} className="rounded-full bg-cream px-3 py-1 text-xs text-charcoal">{item.title} × {item.qty}</li>)}
              </ul>
            ) : null}
            {can('orders.manage') && (order.status === 'pending' || order.status === 'processing') ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {order.status === 'pending' ? <Button size="sm" disabled={busy === order.id} onClick={() => void update(order.id, 'processing')}>Start processing</Button> : null}
                <Button size="sm" variant="danger" disabled={busy === order.id} onClick={() => void update(order.id, 'cancelled')}>Cancel order</Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
