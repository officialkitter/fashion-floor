'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Image as ImageIcon, Package, Search, X } from 'lucide-react';
import { Button, Card, EmptyState, Img, NoAccess, PageHeader, StatusBadge, Tabs } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';
import type { Product } from '@/lib/data';
import { money } from '@/lib/utils';

type CatalogSection = 'products' | 'services' | 'browse';
type StatusFilter = 'all' | 'pending' | 'published' | 'rejected';

export default function CatalogPage() {
  const { role, can, own } = useAccess();
  const { products, services, queryErrors, dataLoading, reviewProduct, reviewService } = useStore();
  const [section, setSection] = useState<CatalogSection>('products');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [browseProducts, setBrowseProducts] = useState<Product[]>([]);
  const [browseFetched, setBrowseFetched] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseRetry, setBrowseRetry] = useState(0);
  const [browseError, setBrowseError] = useState<string | null>(null);

  const ownProducts = own(products);
  const ownServices = own(services);

  useEffect(() => {
    if (section !== 'browse' || browseFetched) return;
    const supabase = getSupabase();
    if (!supabase) {
      setBrowseError('The shared catalog is unavailable because Supabase is not configured.');
      return;
    }
    let active = true;
    setBrowseLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from('product_cards').select('*')
          .order('seller_rating', { ascending: false })
          .order('seller_review_count', { ascending: false })
          .order('id', { ascending: true })
          .limit(100);
        if (!active) return;
        if (error) {
          setBrowseError(error.message);
          return;
        }
        type CardRow = {
          id: string;
          vendor_id: string;
          seller_name: string | null;
          brand_tag: { label: string } | null;
          title: string;
          category: string | null;
          price_minor: number;
          currency: string | null;
          sizes: { size: string; stock: number }[] | null;
          images: string[] | null;
          description: string | null;
        };
        const rows = (data ?? []) as CardRow[];
        setBrowseProducts(rows.map((row) => ({
          id: row.id,
          vendorId: row.vendor_id,
          storeName: row.seller_name ?? '',
          brandName: row.brand_tag?.label ?? '',
          title: row.title,
          category: row.category ?? '',
          price: Number(row.price_minor) / 100,
          currency: row.currency ?? 'TZS',
          stock: (row.sizes ?? []).reduce((sum: number, entry: { stock?: number }) => sum + Number(entry.stock ?? 0), 0),
          stockTarget: 0,
          priceConfirmed: true,
          brandPartnershipStatus: 'verified',
          brandApprovalStatus: 'published',
          verificationReference: '',
          storeApprovalStatus: 'published',
          partnerStatus: 'approved',
          sizes: row.sizes ?? [],
          images: row.images ?? [],
          active: true,
          approvalStatus: 'published',
          description: row.description ?? '',
          createdAt: '',
        })));
        setBrowseFetched(true);
      } catch (error) {
        if (active) setBrowseError(error instanceof Error ? error.message : 'The shared catalog could not be loaded.');
      } finally {
        if (active) setBrowseLoading(false);
      }
    })();
    return () => { active = false; };
  }, [browseFetched, browseRetry, section]);

  const productList = useMemo(() => ownProducts.filter((product) =>
    (statusFilter === 'all' || product.approvalStatus === statusFilter)
    && `${product.title} ${product.brandName} ${product.storeName} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [ownProducts, search, statusFilter]);
  const serviceList = useMemo(() => ownServices.filter((service) =>
    (statusFilter === 'all' || service.approvalStatus === statusFilter)
    && `${service.name} ${service.businessName} ${service.category}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [ownServices, search, statusFilter]);
  const visibleBrowse = useMemo(() => browseProducts.filter((product) =>
    `${product.title} ${product.brandName} ${product.storeName} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [browseProducts, search]);

  async function handleReview(kind: 'product' | 'service', id: string, decision: 'published' | 'rejected') {
    setActionId(id);
    setActionError(null);
    try {
      if (kind === 'product') await reviewProduct(id, decision);
      else await reviewService(id, decision);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The review could not be saved.');
    } finally {
      setActionId(null);
    }
  }

  const statusTabs = [
    { value: 'all' as const, label: 'All' },
    { value: 'pending' as const, label: 'Awaiting review' },
    { value: 'published' as const, label: 'Approved' },
    { value: 'rejected' as const, label: 'Not approved' },
  ];
  const sections = [
    { value: 'products' as const, label: 'Products', count: ownProducts.filter((product) => product.approvalStatus === 'pending').length },
    { value: 'services' as const, label: 'Services', count: ownServices.filter((service) => service.approvalStatus === 'pending').length },
    { value: 'browse' as const, label: 'Browse approved products' },
  ];

  if (!role || !can('catalog.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="the catalog" />;

  return (
    <>
      <PageHeader title="Products and services" subtitle="Review submissions, check live stock, and browse approved products already in the shared catalog." />
      {actionError ? <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{actionError}</p> : null}
      {queryErrors.products ? <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load products: {queryErrors.products}</p> : null}
      {queryErrors.services ? <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load services: {queryErrors.services}</p> : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs id="catalog-section" value={section} onChange={(value) => { setSection(value); setSearch(''); }} items={sections} />
        <label className="flex h-11 min-w-56 items-center gap-2 rounded-full bg-white px-4 text-stone ring-1 ring-coffee/10 focus-within:ring-coffee/40">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search catalog</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products or brands" className="w-full bg-transparent text-sm text-coffee outline-none placeholder:text-stone" />
        </label>
      </div>

      {section !== 'browse' ? <div className="mb-5"><Tabs id="catalog-status" value={statusFilter} onChange={setStatusFilter} items={statusTabs} /></div> : null}

      {section === 'products' ? (
        <>
          {dataLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading the latest products…</p> : null}
          {!dataLoading && !queryErrors.products && !productList.length ? <EmptyState title="No products found" hint="Try another review status or search, or add product listings from your store account." /> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {productList.map((product) => {
              const canPublish = Boolean(
                product.images.length && product.description.trim() && product.stock > 0
                && product.price > 0 && product.priceConfirmed && product.category.trim()
                && product.brandPartnershipStatus === 'verified' && product.brandApprovalStatus === 'published'
                && product.storeApprovalStatus === 'published' && product.partnerStatus === 'approved',
              );
              return <article key={product.id} className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-black/5">
                {product.images[0] ? <Img src={product.images[0]} alt={product.title} className="h-52 w-full" /> : <div className="flex h-52 flex-col items-center justify-center gap-2 bg-mist text-stone"><ImageIcon size={28} aria-hidden="true" /><span className="text-xs font-semibold">Photo required before approval</span></div>}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h2 className="font-bold text-coffee">{product.title}</h2><p className="mt-1 truncate text-sm text-stone">{product.brandName} · {product.storeName}</p></div>
                    <StatusBadge status={product.approvalStatus} label={product.approvalStatus === 'pending' ? 'Awaiting review' : product.approvalStatus === 'published' ? 'Approved' : 'Not approved'} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-stone">{product.description || 'Add a clear product description before requesting approval.'}</p>
                  <p className="mt-4 text-xl font-extrabold text-coffee">{money(product.price, product.currency)}{!product.priceConfirmed ? <span className="ml-2 text-xs font-semibold text-amber-800">Proposed</span> : null}</p>
                  <p className="mt-1 text-sm text-stone">{product.category} · {product.stock} units on hand{product.stockTarget > 0 ? ` · ${product.stockTarget} opening target` : ''}</p>
                  {product.sizes.length ? <p className="mt-3 text-xs text-stone">Stock by size: {product.sizes.map((size) => `${size.size}: ${size.stock}`).join(' · ')}</p> : null}
                  {product.approvalStatus === 'pending' && can('catalog.approve') ? <div className="mt-4 flex gap-2">
                    <Button variant="success" size="sm" disabled={!canPublish || actionId === product.id} onClick={() => void handleReview('product', product.id, 'published')}><Check size={15} aria-hidden="true" /> Approve</Button>
                    <Button variant="danger" size="sm" disabled={actionId === product.id} onClick={() => void handleReview('product', product.id, 'rejected')}><X size={15} aria-hidden="true" /> Decline</Button>
                  </div> : null}
                  {product.approvalStatus === 'pending' && can('catalog.approve') && !canPublish ? <p className="mt-2 text-xs font-medium text-amber-800">Approval requires a photo, full description, category, confirmed price, verified brand and store, approved partner, and physically received stock.</p> : null}
                </div>
              </article>;
            })}
          </div>
        </>
      ) : null}

      {section === 'services' ? (
        <>
          {dataLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading service listings…</p> : null}
          {!dataLoading && !serviceList.length ? <EmptyState title="No services found" hint="Provider services need a description, price, duration, and business photo before approval." /> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {serviceList.map((service) => {
              const canPublish = Boolean(
                service.coverUrl && service.description.trim() && service.price > 0
                && service.priceConfirmed && service.durationMinutes > 0
                && service.businessApprovalStatus === 'published' && service.partnerStatus === 'approved',
              );
              return <article key={service.id} className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-black/5">
                {service.coverUrl ? <Img src={service.coverUrl} alt={service.businessName} className="h-52 w-full" /> : <div className="flex h-52 flex-col items-center justify-center gap-2 bg-mist text-stone"><ImageIcon size={28} aria-hidden="true" /><span className="text-xs font-semibold">Business photo required</span></div>}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold text-coffee">{service.name}</h2><p className="mt-1 truncate text-sm text-stone">{service.businessName} · {service.category}</p></div><StatusBadge status={service.approvalStatus} label={service.approvalStatus === 'pending' ? 'Awaiting review' : service.approvalStatus === 'published' ? 'Approved' : 'Not approved'} /></div>
                  <p className="mt-3 line-clamp-3 text-sm text-stone">{service.description || 'Add service details before requesting approval.'}</p>
                  <p className="mt-4 text-xl font-extrabold text-coffee">{money(service.price, service.currency)}{!service.priceConfirmed ? <span className="ml-2 text-xs font-semibold text-amber-800">Proposed</span> : null}</p><p className="mt-1 text-sm text-stone">{service.durationMinutes} minutes</p>
                  {service.approvalStatus === 'pending' && can('catalog.approve') ? <div className="mt-4 flex gap-2">
                    <Button variant="success" size="sm" disabled={!canPublish || actionId === service.id} onClick={() => void handleReview('service', service.id, 'published')}><Check size={15} aria-hidden="true" /> Approve</Button>
                    <Button variant="danger" size="sm" disabled={actionId === service.id} onClick={() => void handleReview('service', service.id, 'rejected')}><X size={15} aria-hidden="true" /> Decline</Button>
                  </div> : null}
                  {service.approvalStatus === 'pending' && can('catalog.approve') && !canPublish ? <p className="mt-2 text-xs font-medium text-amber-800">Approval requires an approved provider, business photo, description, confirmed price, and duration.</p> : null}
                </div>
              </article>;
            })}
          </div>
        </>
      ) : null}

      {section === 'browse' ? (
        <>
          <p className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">These products are already approved and visible in the shared boutique. Use them as a reference before submitting new stock.</p>
          {browseError ? <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800"><span>{browseError}</span><Button variant="secondary" size="sm" onClick={() => { setBrowseError(null); setBrowseRetry((value) => value + 1); }}>Try again</Button></div> : null}
          {browseLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading approved products…</p> : null}
          {!browseLoading && !browseError && !visibleBrowse.length ? <EmptyState title="No approved products match" hint="Try another search. Only published products appear in this browse list." /> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleBrowse.map((product) => <Card key={product.id} className="overflow-hidden p-0">
              {product.images[0] ? <Img src={product.images[0]} alt={product.title} className="h-52 w-full" /> : <div className="flex h-52 items-center justify-center bg-mist text-stone"><Package size={28} aria-hidden="true" /></div>}
              <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-coffee">{product.title}</h2><p className="mt-1 text-sm text-stone">{product.brandName} · {product.storeName}</p></div><StatusBadge status="published" label="Approved" /></div><p className="mt-4 text-xl font-extrabold text-coffee">{money(product.price, product.currency)}</p><p className="mt-1 text-sm text-stone">{product.category} · {product.stock} available</p></div>
            </Card>)}
          </div>
        </>
      ) : null}
    </>
  );
}
