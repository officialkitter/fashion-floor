'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ArrowDown,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleHelp,
  MapPin,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type Listing = Record<string, unknown>;
type ViewData = {
  count: number | null;
  rows: Listing[];
  error: boolean;
};
type Directory = {
  products: ViewData;
  stylists: ViewData;
  buildings: ViewData;
};

const EMPTY_VIEW: ViewData = { count: null, rows: [], error: false };
const VIEW_NAMES = {
  products: 'product_cards',
  stylists: 'lounge_stylists',
  buildings: 'fashion_buildings',
} as const;

function getText(row: Listing, fields: string[], fallback: string) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
    if (value !== null && typeof value === 'object' && 'label' in value && typeof value.label === 'string') return value.label;
  }
  return fallback;
}

function getImage(row: Listing) {
  const image = getText(row, ['image_url', 'image', 'photo_url', 'cover_url', 'avatar_url'], '');
  if (image) return image;
  const images = row.images;
  return Array.isArray(images) && typeof images[0] === 'string' ? images[0] : '';
}

function getPrice(row: Listing) {
  const priceMinor = row.price_minor;
  const currency = getText(row, ['currency'], 'TZS');
  if (typeof priceMinor !== 'number' && typeof priceMinor !== 'string') return '';
  const value = Number(priceMinor);
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TZS' ? 0 : 2,
  }).format(value / 100);
}

function ListingCards({ view, kind, configured, loading }: { view: ViewData; kind: 'product' | 'stylist' | 'building'; configured: boolean; loading: boolean }) {
  const icon = kind === 'product' ? <Shirt aria-hidden="true" /> : kind === 'stylist' ? <Scissors aria-hidden="true" /> : <Building2 aria-hidden="true" />;
  const fields = kind === 'product'
    ? ['name', 'title', 'product_name']
    : kind === 'stylist'
      ? ['name', 'full_name', 'display_name', 'business_name']
      : ['name', 'title', 'building_name', 'business_name'];

  if (!configured) {
    return <p className="empty-note">Data not connected.</p>;
  }
  if (loading) {
    return <p className="empty-note" role="status">Loading public listings…</p>;
  }
  if (view.error) {
    return <p className="empty-note">Listings could not be loaded right now. Please try again later.</p>;
  }
  if (!view.rows.length) {
    return <p className="empty-note">No verified listings yet.</p>;
  }

  return (
    <ul className="listing-grid">
      {view.rows.map((row, index) => {
        const title = getText(row, fields, kind === 'product' ? 'Fashion listing' : kind === 'stylist' ? 'Lounge service' : 'Fashion business');
        const detail = getText(
          row,
          kind === 'product'
            ? ['brand_name', 'brand_tag', 'category']
            : kind === 'stylist'
              ? ['business_name', 'role', 'rating']
              : ['category', 'area', 'city'],
          '',
        );
        const image = getImage(row);
        const price = kind === 'product' ? getPrice(row) : '';
        return (
          <li className="listing-card" key={String(row.id ?? `${title}-${index}`)}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="listing-image" loading="lazy" />
            ) : (
              <span className="listing-icon">{icon}</span>
            )}
            <div className="listing-copy">
              <strong>{title}</strong>
              {detail ? <span>{detail}</span> : null}
            </div>
            {price ? (
              <span className="listing-price">{price}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function LiveDirectory() {
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !publishableKey) return;

    setConfigured(true);
    const supabase: SupabaseClient = createClient(url, publishableKey);
    let active = true;

    async function loadView(view: string): Promise<ViewData> {
      let listingsQuery = supabase.from(view).select('*');
      if (view === VIEW_NAMES.products) {
        listingsQuery = listingsQuery
          .order('seller_rating', { ascending: false })
          .order('seller_review_count', { ascending: false })
          .order('units_sold', { ascending: false });
      } else {
        listingsQuery = listingsQuery.order('rating', { ascending: false });
      }
      const [countResult, rowsResult] = await Promise.all([
        supabase.from(view).select('*', { count: 'exact', head: true }),
        listingsQuery.limit(3),
      ]);
      if (countResult.error || rowsResult.error) return { ...EMPTY_VIEW, error: true };
      return {
        count: countResult.count ?? 0,
        rows: (rowsResult.data ?? []) as Listing[],
        error: false,
      };
    }

    void Promise.all([
      loadView(VIEW_NAMES.products),
      loadView(VIEW_NAMES.stylists),
      loadView(VIEW_NAMES.buildings),
    ]).then(([products, stylists, buildings]) => {
      if (active) setDirectory({ products, stylists, buildings });
    }).catch(() => {
      if (active) {
        setDirectory({
          products: { ...EMPTY_VIEW, error: true },
          stylists: { ...EMPTY_VIEW, error: true },
          buildings: { ...EMPTY_VIEW, error: true },
        });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const data = directory;
  const metrics = [
    { icon: <ShoppingBag aria-hidden="true" />, label: 'Fashion listings', count: data?.products.count },
    { icon: <Scissors aria-hidden="true" />, label: 'Lounge listings', count: data?.stylists.count },
    { icon: <Building2 aria-hidden="true" />, label: 'Fashion businesses', count: data?.buildings.count },
  ];

  return (
    <>
      <section className="directory-section" id="discover" aria-labelledby="discover-title">
        <div className="section-heading">
          <span className="eyebrow"><Sparkles size={15} aria-hidden="true" /> Browse what is listed</span>
          <h2 id="discover-title">Discover Fashion Floor</h2>
          <p>Explore fashion and local services in one place. Listings shown here come directly from the public app directory.</p>
        </div>
        {!configured ? (
          <div className="connection-note" role="status">
            <CircleHelp aria-hidden="true" />
            <span><strong>Data not connected.</strong> Add the public Supabase URL and publishable key to load verified listings.</span>
          </div>
        ) : null}
        <div className="directory-grid">
          <article className="directory-panel">
            <div className="panel-title"><span className="icon-disc brown"><Shirt aria-hidden="true" /></span><div><h3>The Boutique</h3><p>Products and brands to discover</p></div></div>
            <ListingCards view={data?.products ?? EMPTY_VIEW} kind="product" configured={configured} loading={data === null && configured} />
          </article>
          <article className="directory-panel lounge-panel">
            <div className="panel-title"><span className="icon-disc green"><Scissors aria-hidden="true" /></span><div><h3>The Lounge</h3><p>Local stylists and services</p></div></div>
            <ListingCards view={data?.stylists ?? EMPTY_VIEW} kind="stylist" configured={configured} loading={data === null && configured} />
          </article>
          <article className="directory-panel">
            <div className="panel-title"><span className="icon-disc brown"><Building2 aria-hidden="true" /></span><div><h3>Fashion businesses</h3><p>Places and businesses in the directory</p></div></div>
            <ListingCards view={data?.buildings ?? EMPTY_VIEW} kind="building" configured={configured} loading={data === null && configured} />
          </article>
        </div>
      </section>

      <section className="numbers-section" aria-label="Live directory counts">
        <p className="eyebrow">From the public directory</p>
        <div className="metric-grid">
          {metrics.map((metric) => (
            <div className="metric" key={metric.label}>
              <span className="metric-icon">{metric.icon}</span>
              <span className="metric-value">{!configured ? '—' : data === null ? '…' : metric.count == null ? '—' : metric.count.toLocaleString()}</span>
              <span className="metric-label">{metric.label}</span>
            </div>
          ))}
        </div>
        <p className="data-footnote">{!configured ? 'Counts will appear once data is connected.' : data === null ? 'Loading the latest counts…' : 'Counts reflect records in the public Supabase views. No activity or rating totals are inferred.'}</p>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Fashion Floor home">FASHION <span>FLOOR</span></a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#discover">Discover</a>
          <a href="#about">About the app</a>
          <a href="#faq">Questions</a>
        </nav>
        <a className="header-link" href="#discover">Explore listings <ArrowUpRight size={16} aria-hidden="true" /></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow"><MapPin size={15} aria-hidden="true" /> Made for style, close to home</span>
          <h1>Find your next<br /><span>favourite thing.</span></h1>
          <p>Fashion Floor brings two ways to explore together: the Boutique for fashion discovery, and the Lounge for local stylists and services.</p>
          <p className="location-note">Built around Tanzanian style, TZS prices and local services. Listing availability depends on what is currently in the directory.</p>
          <div className="hero-actions">
            <a className="button button-dark" href="#discover">Explore the directory <ArrowDown size={16} aria-hidden="true" /></a>
            <a className="text-link" href="#about">Get to know Fashion Floor <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
          <div className="hero-pills" aria-label="Explore Fashion Floor">
            <span><Shirt size={16} aria-hidden="true" /> Boutique</span>
            <span><Scissors size={16} aria-hidden="true" /> Lounge</span>
            <span><MapPin size={16} aria-hidden="true" /> Local discovery</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-card art-card-main"><ShoppingBag size={36} /><span>FASHION<br />FLOOR</span><small>BOUTIQUE + LOUNGE</small></div>
          <div className="art-card art-card-small"><Scissors size={22} /><span>Style, your way.</span></div>
          <div className="art-stamp">DISCOVER<br />LOCAL</div>
        </div>
      </section>

      <LiveDirectory />

      <section className="about-section" id="about">
        <div className="about-intro">
          <span className="eyebrow">One app, two spaces</span>
          <h2>Made for finding<br />your kind of style.</h2>
          <p>Fashion Floor is a fashion and local-services discovery app concept, centred on the way people shop and find services in Tanzania.</p>
        </div>
        <div className="about-cards">
          <article className="about-card">
            <span className="icon-disc brown"><ShoppingBag aria-hidden="true" /></span>
            <h3>The Boutique</h3>
            <p>Browse fashion listings and discover brands through product information in the app directory.</p>
          </article>
          <article className="about-card lounge-about-card">
            <span className="icon-disc green"><Scissors aria-hidden="true" /></span>
            <h3>The Lounge</h3>
            <p>Find stylists and local services. Directory listings help you discover what is available.</p>
          </article>
        </div>
        <p className="honesty-note"><CheckCircle2 size={17} aria-hidden="true" /> Listings reflect public directory records only. Fashion Floor does not claim unlisted brands or service providers as partners.</p>
      </section>

      <section className="faq-section" id="faq">
        <div><span className="eyebrow">A few useful details</span><h2>Clear answers,<br />no fine print.</h2></div>
        <div className="faq-list">
          <details><summary>What is Fashion Floor? <span>+</span></summary><p>A place to discover fashion listings in the Boutique and local stylist and service listings in the Lounge.</p></details>
          <details><summary>Are the listings live? <span>+</span></summary><p>The directory on this page reads from public Supabase views. If data is not connected or a view has no rows, we say so rather than showing examples as real listings.</p></details>
          <details><summary>Does this page take bookings or payments? <span>+</span></summary><p>No. This page is for discovery and information. It does not process a booking, order or payment.</p></details>
          <details><summary>Are the listed businesses official partners? <span>+</span></summary><p>A listing is not an endorsement or a claim of partnership. This page makes no partner claims.</p></details>
        </div>
      </section>

      <footer className="site-footer">
        <a className="wordmark footer-wordmark" href="#top">FASHION <span>FLOOR</span></a>
        <p>Boutique + Lounge · Fashion discovery and local services</p>
        <a className="footer-top" href="#top">Back to top <ArrowUpRight size={15} aria-hidden="true" /></a>
      </footer>
    </main>
  );
}
