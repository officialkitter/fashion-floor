'use client';

import { EmptyState, NoAccess, PageHeader, StatusBadge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { dayLabel } from '@/lib/utils';

export default function PartnersPage() {
  const { role, can } = useAccess();
  const { partners, loungeLeads, queryErrors, dataLoading } = useStore();
  if (!role || !can('partners.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="suppliers and providers" />;

  return (
    <>
      <PageHeader title="Suppliers & providers" subtitle="Verified partner accounts and private Lounge directory sourcing records." />
      {queryErrors.partners ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load partners: {queryErrors.partners}</p> : null}
      {queryErrors.loungeLeads ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load Lounge directory records: {queryErrors.loungeLeads}</p> : null}
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
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-coffee">Lounge directory sourcing queue</h2>
            <p className="mt-1 text-sm text-stone">Private category records to track sourcing. These are not businesses or public listings.</p>
          </div>
          <p className="rounded-full bg-white px-4 py-2 text-sm font-bold text-coffee ring-1 ring-black/5">{loungeLeads.length} records</p>
        </div>
        {queryErrors.loungeLeads ? null : loungeLeads.length ? (
          <div className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-black/5">
            <div className="max-h-[34rem] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-cream text-xs uppercase tracking-wide text-stone">
                  <tr>
                    <th scope="col" className="px-5 py-3">Reference</th>
                    <th scope="col" className="px-5 py-3">Category</th>
                    <th scope="col" className="px-5 py-3">Location</th>
                    <th scope="col" className="px-5 py-3">Business name</th>
                    <th scope="col" className="px-5 py-3">Source / price evidence</th>
                    <th scope="col" className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/10">
                  {loungeLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="whitespace-nowrap px-5 py-3 font-semibold text-coffee">{lead.referenceCode}</td>
                      <td className="px-5 py-3 text-charcoal">{lead.category}</td>
                      <td className="px-5 py-3 text-stone">{[lead.area, lead.city, lead.country].filter(Boolean).join(', ') || 'Unassigned'}</td>
                      <td className="px-5 py-3 text-stone">{lead.businessName || 'Not sourced'}</td>
                      <td className="px-5 py-3 text-stone">
                        {lead.sourceUrl ? <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-coffee underline">{lead.sourceName || 'View source'}</a> : 'No source'}
                        <span className="block text-xs">{lead.publishedPriceEvidence || 'No published price evidence'}</span>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={lead.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !dataLoading ? (
          <EmptyState title="No Lounge sourcing records" hint="Apply the Lounge directory intake migration to create the private sourcing queue." />
        ) : null}
      </section>
      <section className="mt-8 rounded-3xl border border-dashed border-stone/40 bg-white/70 p-5">
        <h2 className="font-bold text-coffee">Partner management unavailable</h2>
        <p className="mt-1 text-sm text-stone">The shared schema does not expose a secure partner approval or account-provisioning workflow to this app. This list is read-only.</p>
      </section>
    </>
  );
}
