'use client';

import { EmptyState, NoAccess, PageHeader, StatusBadge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { money } from '@/lib/utils';

export default function CatalogPage() {
  const { role, can, own } = useAccess();
  const { products, queryErrors, dataLoading } = useStore();
  if (!role || !can('catalog.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="the catalog" />;

  const list = own(products);
  return (
    <>
      <PageHeader title="Boutique catalog" subtitle="Products and stock totals from the shared Fashion Floor catalog." />
      {queryErrors.products ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">Could not load products: {queryErrors.products}</p> : null}
      {dataLoading ? <p role="status" className="mb-4 text-sm text-stone">Loading the latest products…</p> : null}
      {!dataLoading && !queryErrors.products && !list.length ? <EmptyState title="No products yet" hint="Products will appear here when the database has records for your account." /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((product) => (
          <article key={product.id} className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-coffee">{product.title}</h2>
                <p className="mt-1 text-sm text-stone">{product.brandName} · {product.storeName}</p>
              </div>
              <StatusBadge status={product.active ? 'active' : 'inactive'} />
            </div>
            <p className="mt-4 text-xl font-extrabold text-coffee">{money(product.price, product.currency)}</p>
            <p className="mt-1 text-sm text-stone">{product.category} · {product.stock} in stock</p>
            {product.sizes.length ? <p className="mt-3 text-xs text-stone">Stock by size: {product.sizes.map((size) => `${size.size}: ${size.stock}`).join(' · ')}</p> : null}
          </article>
        ))}
      </div>
      <section className="mt-8 rounded-3xl border border-dashed border-stone/40 bg-white/70 p-5">
        <h2 className="font-bold text-coffee">Lounge staff management unavailable</h2>
        <p className="mt-1 text-sm text-stone">The shared admin views do not provide a complete staff-management workflow. No sample stylist records or editing controls are shown.</p>
      </section>
    </>
  );
}
