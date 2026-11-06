'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button, Card, EmptyState, Img, NoAccess, PageHeader, StatusBadge, Tabs } from '@/components/ui';
import { PartnerRecordEditForm, type PartnerRecordChanges } from '@/components/ListingEditForms';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { dayLabel } from '@/lib/utils';
import { getSupabase } from '@/lib/supabase';

type PartnerSection = 'partners' | 'stores' | 'providers' | 'brands' | 'directory';
type StoreRecord = { id: string; vendor_id: string; vendor_name: string; name: string; city: string; country: string; cover_url: string | null; approval_status: string; is_active: boolean; description?: string | null; address?: string | null };
type BusinessRecord = { id: string; vendor_id: string; vendor_name: string; name: string; category: string; city: string; area: string; cover_url: string | null; approval_status: string; is_active: boolean; description?: string | null; address?: string | null; source_url?: string | null };
type BrandRecord = { id: string; name: string; logo_url: string | null; partnership_status: string; approval_status: string; verification_reference: string | null; is_active: boolean };

export default function PartnersPage() {
  const { role, can } = useAccess();
  const { partners, loungeLeads, queryErrors, dataLoading, setPartnerStatus, savePartnerListing } = useStore();
  const [section, setSection] = useState<PartnerSection>('partners');
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canReview = can('partners.manage') && (role === 'admin' || role === 'super_admin');
  const canEditLocations = can('partners.manage') || (
    (role === 'supplier' || role === 'provider') && can('catalog.manage')
  );

  const loadReviews = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    setLoading(true);
    const [storeResult, businessResult, brandResult] = await Promise.all([
      supabase.from('admin_stores').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_businesses').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_brands').select('*').order('created_at', { ascending: false }),
    ]);
    const failed = storeResult.error ?? businessResult.error ?? brandResult.error;
    if (failed) setError(`Could not load partner review queues: ${failed.message}`);
    else {
      setStores((storeResult.data ?? []) as StoreRecord[]);
      setBusinesses((businessResult.data ?? []) as BusinessRecord[]);
      setBrands((brandResult.data ?? []) as BrandRecord[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  async function reviewEntity(kind: 'store' | 'business' | 'brand', id: string, decision: 'published' | 'rejected') {
    const supabase = getSupabase();
    if (!supabase) return setError('Supabase is not configured.');
    setActionId(id);
    setError(null);
    setMessage(null);
    const rpc = kind === 'store' ? 'review_store' : kind === 'business' ? 'review_business' : 'review_brand';
    const args = kind === 'brand'
      ? { target_brand_id: id, decision, evidence_reference: evidence[id]?.trim() ?? '' }
      : kind === 'store'
        ? { target_store_id: id, decision }
        : { target_business_id: id, decision };
    const { error: rpcError } = await supabase.rpc(rpc, args);
    setActionId(null);
    if (rpcError) return setError(rpcError.message);
    setMessage(`${kind === 'business' ? 'Service provider' : kind === 'brand' ? 'Brand' : 'Store'} review saved.`);
    await loadReviews();
  }

  async function reviewPartner(id: string, status: 'approved' | 'rejected') {
    setActionId(id);
    setError(null);
    setMessage(null);
    try {
      await setPartnerStatus(id, status);
      setMessage(`Partner ${status === 'approved' ? 'approved' : 'declined'}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Partner review could not be saved.');
    } finally {
      setActionId(null);
    }
  }

  async function saveLocation(kind: 'store' | 'provider', id: string, changes: PartnerRecordChanges) {
    setActionId(id);
    setError(null);
    setMessage(null);
    try {
      await savePartnerListing(kind, id, changes);
      setMessage(`${kind === 'provider' ? 'Provider' : 'Store'} details saved. The record is awaiting review again.`);
      setEditingId(null);
      await loadReviews();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The listing could not be saved.');
      throw reason;
    } finally {
      setActionId(null);
    }
  }

  if (!role || !can('partners.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="suppliers and providers" />;

  const sections = [
    { value: 'partners' as const, label: 'Suppliers and providers', count: partners.filter((item) => item.status === 'pending').length },
    { value: 'stores' as const, label: 'Stores', count: stores.filter((item) => item.approval_status === 'pending').length },
    { value: 'providers' as const, label: 'Service locations', count: businesses.filter((item) => item.approval_status === 'pending').length },
    { value: 'brands' as const, label: 'Brand authorization', count: brands.filter((item) => item.approval_status === 'pending').length },
    { value: 'directory' as const, label: 'Lounge sourcing', count: loungeLeads.length },
  ];

  return (
    <>
      <PageHeader title="Partner verification" subtitle="Review suppliers, stores, service providers, and brand authorization before public listings go live." />
      {error ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {message ? <p role="status" className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p> : null}
      {queryErrors.partners ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load partners: {queryErrors.partners}</p> : null}
      {queryErrors.loungeLeads ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load Lounge directory records: {queryErrors.loungeLeads}</p> : null}
      <div className="mb-5"><Tabs id="partner-review" value={section} onChange={setSection} items={sections} /></div>

      {section === 'partners' ? (
        <>
          {dataLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading suppliers and providers…</p> : null}
          {!dataLoading && !queryErrors.partners && !partners.length ? <EmptyState title="No partner accounts yet" hint="Supplier and service-provider accounts appear here after onboarding." /> : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {partners.map((partner) => (
              <Card key={partner.id}>
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
                {canReview && partner.status === 'pending' ? <div className="mt-4 flex gap-2">
                  <Button variant="success" size="sm" disabled={actionId === partner.id} onClick={() => void reviewPartner(partner.id, 'approved')}>Approve partner</Button>
                  <Button variant="danger" size="sm" disabled={actionId === partner.id} onClick={() => void reviewPartner(partner.id, 'rejected')}>Decline</Button>
                </div> : null}
              </Card>
            ))}
          </div>
        </>
      ) : null}

      {section === 'stores' ? (
        <ReviewList
          kind="store"
          loading={loading}
          empty="No stores are waiting for review."
          records={stores}
          canEdit={canEditLocations}
          canReview={canReview}
          actionId={actionId}
          editingId={editingId}
          onToggleEdit={(id) => setEditingId(editingId === id ? null : id)}
          onSave={saveLocation}
          onReview={(id, decision) => void reviewEntity('store', id, decision)}
        />
      ) : null}
      {section === 'providers' ? (
        <ReviewList
          kind="provider"
          loading={loading}
          empty="No service locations are waiting for review."
          records={businesses}
          canEdit={canEditLocations}
          canReview={canReview}
          actionId={actionId}
          editingId={editingId}
          onToggleEdit={(id) => setEditingId(editingId === id ? null : id)}
          onSave={saveLocation}
          onReview={(id, decision) => void reviewEntity('business', id, decision)}
        />
      ) : null}
      {section === 'brands' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!loading && brands.length === 0 ? <EmptyState title="No brands need review" hint="Brand authorization records will appear here as they are submitted." /> : null}
          {brands.map((brand) => (
            <Card key={brand.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {brand.logo_url ? <Img src={brand.logo_url} alt="" className="h-12 w-12 rounded-xl" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mist text-xs font-bold text-stone">BR</div>}
                  <div><h2 className="font-bold text-coffee">{brand.name}</h2><p className="text-xs text-stone">{brand.partnership_status.replaceAll('_', ' ')}</p></div>
                </div>
                <StatusBadge status={brand.approval_status} />
              </div>
              {brand.approval_status === 'pending' && canReview ? (
                <>
                  <label className="mt-4 block text-xs font-bold text-stone">Authorization or official-source URL</label>
                  <input type="url" required value={evidence[brand.id] ?? ''} onChange={(event) => setEvidence((current) => ({ ...current, [brand.id]: event.target.value }))} placeholder="https://brand-owned-or-contract-source" className="mt-1 w-full rounded-xl border border-coffee/15 px-3 py-2 text-sm" />
                  <div className="mt-3 flex gap-2">
                    <Button variant="success" size="sm" disabled={actionId === brand.id || !evidence[brand.id]?.trim()} onClick={() => void reviewEntity('brand', brand.id, 'published')}>Verify brand</Button>
                    <Button variant="danger" size="sm" disabled={actionId === brand.id} onClick={() => void reviewEntity('brand', brand.id, 'rejected')}>Decline</Button>
                  </div>
                </>
              ) : null}
              {brand.verification_reference ? <a href={brand.verification_reference} target="_blank" rel="noreferrer" className="mt-3 block break-all text-xs font-semibold text-coffee underline">View recorded verification evidence</a> : null}
            </Card>
          ))}
        </div>
      ) : null}

      {section === 'directory' ? (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-extrabold text-coffee">Lounge directory sourcing</h2><p className="mt-1 text-sm text-stone">Private category records to track sourcing. These are not verified businesses or public listings.</p></div>
            <p className="rounded-full bg-white px-4 py-2 text-sm font-bold text-coffee ring-1 ring-black/5">{loungeLeads.length} records</p>
          </div>
          {!loungeLeads.length && !dataLoading ? <EmptyState title="No sourcing records" hint="Directory records appear here when the source has been verified." /> : null}
          {loungeLeads.length ? <div className="overflow-auto rounded-3xl bg-white shadow-card ring-1 ring-black/5">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-wide text-stone"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Business</th><th className="px-5 py-3">Source / price evidence</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-stone/10">{loungeLeads.map((lead) => <tr key={lead.id}>
                <td className="whitespace-nowrap px-5 py-3 font-semibold text-coffee">{lead.referenceCode}</td><td className="px-5 py-3">{lead.category}</td><td className="px-5 py-3 text-stone">{[lead.area, lead.city, lead.country].filter(Boolean).join(', ') || 'Unassigned'}</td><td className="px-5 py-3 text-stone">{lead.businessName || 'Not sourced'}</td>
                <td className="px-5 py-3 text-stone">{lead.sourceUrl ? <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-coffee underline">{lead.sourceName || 'View source'}</a> : 'No source'}<span className="block text-xs">{lead.publishedPriceEvidence || 'No published price evidence'}</span></td><td className="px-5 py-3"><StatusBadge status={lead.status} /></td>
              </tr>)}</tbody>
            </table>
          </div> : null}
        </section>
      ) : null}
    </>
  );
}

function ReviewList<T extends StoreRecord | BusinessRecord>({
  kind,
  loading,
  empty,
  records,
  canEdit,
  canReview,
  actionId,
  editingId,
  onToggleEdit,
  onSave,
  onReview,
}: {
  kind: 'store' | 'provider';
  loading: boolean;
  empty: string;
  records: T[];
  canEdit: boolean;
  canReview: boolean;
  actionId: string | null;
  editingId: string | null;
  onToggleEdit: (id: string) => void;
  onSave: (kind: 'store' | 'provider', id: string, changes: PartnerRecordChanges) => Promise<void>;
  onReview: (id: string, decision: 'published' | 'rejected') => void;
}) {
  if (loading) return <p role="status" className="text-sm text-stone">Loading review queue…</p>;
  if (!records.length) return <EmptyState title={empty} hint="New submissions will appear here and remain hidden until approval." />;
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{records.map((record) => (
    <Card key={record.id}>
      {record.cover_url ? <Img src={record.cover_url} alt="" className="mb-4 h-40 w-full rounded-2xl" /> : <div className="mb-4 flex h-40 items-center justify-center rounded-2xl bg-mist text-sm font-semibold text-stone">Verified photo required</div>}
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-coffee">{record.name}</h2><p className="mt-1 text-sm text-stone">{record.vendor_name}</p></div><StatusBadge status={record.approval_status} /></div>
      <p className="mt-3 text-sm text-stone">{'category' in record ? `${record.category} · ${record.area}, ${record.city}` : `${record.city}, ${record.country}`}</p>
      {'source_url' in record && record.source_url ? <a href={record.source_url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-semibold text-coffee underline">Official provider source</a> : null}
      {canEdit ? <Button variant="secondary" size="sm" className="mt-4" onClick={() => onToggleEdit(record.id)}><Pencil size={14} aria-hidden="true" /> {editingId === record.id ? 'Close editor' : 'Edit details and photos'}</Button> : null}
      {canEdit && editingId === record.id ? <PartnerRecordEditForm key={`${record.id}-${record.approval_status}`} kind={kind} record={record} saving={actionId === record.id} onSave={(changes) => onSave(kind, record.id, changes)} /> : null}
      {record.approval_status === 'pending' && canReview ? <div className="mt-4 flex gap-2">
        <Button variant="success" size="sm" disabled={actionId === record.id} onClick={() => onReview(record.id, 'published')}>Approve</Button>
        <Button variant="danger" size="sm" disabled={actionId === record.id} onClick={() => onReview(record.id, 'rejected')}>Decline</Button>
      </div> : null}
    </Card>
  ))}</div>;
}
