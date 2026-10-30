'use client';

import { EmptyState, NoAccess, PageHeader, StatusBadge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { dayLabel } from '@/lib/utils';

export default function PartnersPage() {
  const { role, can } = useAccess();
  const { partners, queryErrors, dataLoading } = useStore();
  if (!role || !can('partners.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="suppliers and providers" />;

  return (
    <>
      <PageHeader title="Suppliers & providers" subtitle="Partner records from the shared platform database." />
      {queryErrors.partners ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load partners: {queryErrors.partners}</p> : null}
      {dataLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading the latest partners…</p> : null}
      {!dataLoading && !queryErrors.partners && !partners.length ? <EmptyState title="No partners yet" hint="Partner records will appear here when the database has records." /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {partners.map((partner) => (
          <article key={partner.id} className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-coffee">{partner.name}</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-stone">{partner.type === 'supplier' ? 'Supplier' : 'Service provider'}</p>
              </div>
              <StatusBadge status={partner.status} label={partner.active ? 'Active' : partner.status} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-stone">Owner</dt><dd className="text-right font-medium text-charcoal">{partner.owner || 'Not provided'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-stone">Email</dt><dd className="break-all text-right font-medium text-charcoal">{partner.email || 'Not provided'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-stone">City</dt><dd className="text-right font-medium text-charcoal">{partner.city || 'Not provided'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-stone">Added</dt><dd className="text-right font-medium text-charcoal">{dayLabel(partner.createdAt)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <section className="mt-8 rounded-3xl border border-dashed border-stone/40 bg-white/70 p-5">
        <h2 className="font-bold text-coffee">Partner management unavailable</h2>
        <p className="mt-1 text-sm text-stone">The shared schema does not expose a secure partner approval or account-provisioning workflow to this app. This list is read-only.</p>
      </section>
    </>
  );
}
