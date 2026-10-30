'use client';

import { useState } from 'react';
import { Button, EmptyState, NoAccess, PageHeader, StatusBadge, useToast } from '@/components/ui';
import type { BookingStatus } from '@/lib/data';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { dayLabel, maskEmail, money, timeLabel } from '@/lib/utils';

export default function BookingsPage() {
  const toast = useToast();
  const { role, can, own, scope } = useAccess();
  const { bookings, queryErrors, dataLoading, setBookingStatus } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  if (!role || !can('bookings.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="appointments" />;
  const list = own(bookings);
  const update = async (id: string, status: BookingStatus) => {
    setBusy(id);
    try {
      await setBookingStatus(id, status);
      toast('Appointment status saved.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Appointment update failed.', 'bad');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Appointments" subtitle="Live Lounge appointments. Confirmations and changes are saved securely by the database." />
      {queryErrors.bookings ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load appointments: {queryErrors.bookings}</p> : null}
      {dataLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading the latest appointments…</p> : null}
      {!dataLoading && !queryErrors.bookings && !list.length ? <EmptyState title="No appointments yet" hint="Appointments will appear here when the database has records for your account." /> : null}
      <div className="space-y-3">
        {list.map((booking) => {
          const past = new Date(booking.startsAt).getTime() < Date.now();
          return (
            <article key={booking.id} className="flex flex-wrap items-center gap-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5">
              <div className="min-w-[7rem]">
                <p className="font-bold text-coffee">{dayLabel(booking.startsAt)}</p>
                <p className="text-sm text-stone">{timeLabel(booking.startsAt)}</p>
              </div>
              <div className="min-w-[180px] flex-1">
                <h2 className="font-bold text-coffee">{booking.service} · {money(booking.price, booking.currency)}</h2>
                <p className="text-sm text-stone">{booking.customer.name} {booking.customer.email ? `(${scope === 'own' ? maskEmail(booking.customer.email) : booking.customer.email})` : ''}</p>
                <p className="text-xs text-stone">{booking.stylistName} · {booking.businessName}</p>
              </div>
              <StatusBadge status={booking.status} />
              {can('bookings.manage') ? (
                <div className="flex flex-wrap gap-2">
                  {booking.status === 'pending' ? <Button size="sm" disabled={busy === booking.id} onClick={() => void update(booking.id, 'confirmed')}>Confirm</Button> : null}
                  {booking.status === 'confirmed' && past ? <Button size="sm" variant="secondary" disabled={busy === booking.id} onClick={() => void update(booking.id, 'completed')}>Mark completed</Button> : null}
                  {booking.status === 'pending' || booking.status === 'confirmed' ? <Button size="sm" variant="danger" disabled={busy === booking.id} onClick={() => void update(booking.id, 'cancelled')}>Cancel</Button> : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}
