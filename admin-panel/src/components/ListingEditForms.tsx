'use client';

import { type FormEvent, useState } from 'react';
import type { BusinessService, Product } from '@/lib/data';
import type { PartnerListingChanges, ProductChanges, ServiceChanges } from '@/lib/store';
import { Button } from '@/components/ui';
import { ImageUploadField } from '@/components/ImageUploadField';

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-coffee">
      {label}
      <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm font-normal text-charcoal outline-none focus:border-coffee/50" />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-coffee">
      {label}
      <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm font-normal text-charcoal outline-none focus:border-coffee/50" />
    </label>
  );
}

export function ProductEditForm({
  product,
  saving,
  onSave,
}: {
  product: Product;
  saving: boolean;
  onSave: (changes: ProductChanges) => Promise<void>;
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(String(product.price));
  const [originalPrice, setOriginalPrice] = useState(product.originalPrice == null ? '' : String(product.originalPrice));
  const [currency, setCurrency] = useState(product.currency);
  const [images, setImages] = useState(product.images);
  const [sizesText, setSizesText] = useState(product.sizes.map((item) => `${item.size}:${item.stock}`).join('\n'));
  const [colors, setColors] = useState(product.colors.join(', '));
  const [material, setMaterial] = useState(product.material);
  const [fit, setFit] = useState(product.fit);
  const [care, setCare] = useState(product.care);
  const [origin, setOrigin] = useState(product.origin);
  const [shipping, setShipping] = useState(product.shipping);
  const [returns, setReturns] = useState(product.returns);
  const [authenticity, setAuthenticity] = useState(product.authenticity);
  const [season, setSeason] = useState(product.season);
  const [confirmPrice, setConfirmPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedPrice = Number(price);
    const parsedOriginalPrice = originalPrice.trim() ? Number(originalPrice) : null;
    const sizes = sizesText.split(/\r?\n/).map((line) => {
      const [size, stockText] = line.split(':');
      return { size: size?.trim() ?? '', stock: stockText?.trim() ? Number(stockText) : Number.NaN };
    }).filter((item) => item.size || Number.isFinite(item.stock));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0
      || (parsedOriginalPrice !== null && (!Number.isFinite(parsedOriginalPrice) || parsedOriginalPrice < parsedPrice))) {
      setError('Enter a valid selling price. The original price must be greater than or equal to it.');
      return;
    }
    if (!sizes.length || sizes.some((item) => !item.size || !Number.isInteger(item.stock) || item.stock < 0)
      || new Set(sizes.map((item) => item.size.toLowerCase())).size !== sizes.length) {
      setError('Enter each size once with a whole-number quantity per line, for example M:4.');
      return;
    }
    try {
      await onSave({
        title, description, category, priceMinor: Math.round(parsedPrice * 100),
        originalPriceMinor: parsedOriginalPrice == null ? null : Math.round(parsedOriginalPrice * 100),
        currency, images, sizes, colors: colors.split(',').map((item) => item.trim()).filter(Boolean),
        material, fit, care, origin, shipping, returns, authenticity, season, confirmPrice,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The product could not be saved.');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4 border-t border-coffee/10 pt-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Product name" value={title} onChange={setTitle} required />
        <TextInput label="Clothing category" value={category} onChange={setCategory} required />
        <TextInput label="Selling price" value={price} onChange={setPrice} type="number" required />
        <TextInput label="Original price (optional)" value={originalPrice} onChange={setOriginalPrice} type="number" />
        <TextInput label="Currency" value={currency} onChange={setCurrency} required />
        <TextInput label="Colours, separated by commas" value={colors} onChange={setColors} />
        <TextInput label="Material" value={material} onChange={setMaterial} />
        <TextInput label="Fit" value={fit} onChange={setFit} />
        <TextInput label="Care instructions" value={care} onChange={setCare} />
        <TextInput label="Country of origin" value={origin} onChange={setOrigin} />
        <TextInput label="Shipping information" value={shipping} onChange={setShipping} />
        <TextInput label="Returns information" value={returns} onChange={setReturns} />
        <TextInput label="Authenticity details" value={authenticity} onChange={setAuthenticity} />
        <TextInput label="Season" value={season} onChange={setSeason} />
      </div>
      <TextArea label="Product description" value={description} onChange={setDescription} required />
      <TextArea label="Stock by size (one per line: size:quantity)" value={sizesText} onChange={setSizesText} required />
      <ImageUploadField label="Product photos" value={images} onChange={setImages} multiple />
      <label className="flex items-start gap-2 text-sm text-charcoal">
        <input type="checkbox" checked={confirmPrice} onChange={(event) => setConfirmPrice(event.target.checked)} className="mt-1 accent-coffee" />
        I confirm this is the current selling price. Price changes require review before publication.
      </label>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <Button type="submit" disabled={saving}>{saving ? 'Saving product…' : 'Save product details'}</Button>
    </form>
  );
}

export function ServiceEditForm({
  service,
  saving,
  onSave,
}: {
  service: BusinessService;
  saving: boolean;
  onSave: (changes: ServiceChanges) => Promise<void>;
}) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const [price, setPrice] = useState(String(service.price));
  const [currency, setCurrency] = useState(service.currency);
  const [duration, setDuration] = useState(String(service.durationMinutes));
  const [confirmPrice, setConfirmPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      setError('Enter a valid price and service duration in whole minutes.');
      return;
    }
    try {
      await onSave({ name, description, priceMinor: Math.round(parsedPrice * 100), currency, durationMinutes: parsedDuration, confirmPrice });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The service could not be saved.');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4 border-t border-coffee/10 pt-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Service name" value={name} onChange={setName} required />
        <TextInput label="Price" value={price} onChange={setPrice} type="number" required />
        <TextInput label="Currency" value={currency} onChange={setCurrency} required />
        <TextInput label="Duration in minutes" value={duration} onChange={setDuration} type="number" required />
      </div>
      <TextArea label="Service description" value={description} onChange={setDescription} required />
      <p className="text-xs text-stone">Provider photo and source are managed in Partner verification → Service locations.</p>
      <label className="flex items-start gap-2 text-sm text-charcoal">
        <input type="checkbox" checked={confirmPrice} onChange={(event) => setConfirmPrice(event.target.checked)} className="mt-1 accent-coffee" />
        I confirm this is the current service price.
      </label>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <Button type="submit" disabled={saving}>{saving ? 'Saving service…' : 'Save service details'}</Button>
    </form>
  );
}

export interface PartnerRecordChanges {
  name: string;
  category: string;
  city: string;
  area: string;
  country: string;
  address: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
}

export function PartnerRecordEditForm({
  kind,
  record,
  saving,
  onSave,
}: {
  kind: 'store' | 'provider';
  record: {
    id: string;
    name: string;
    city: string;
    cover_url: string | null;
    description?: string | null;
    address?: string | null;
    country?: string;
    category?: string;
    area?: string;
    source_url?: string | null;
  };
  saving: boolean;
  onSave: (changes: PartnerListingChanges) => Promise<void>;
}) {
  const [name, setName] = useState(record.name);
  const [category, setCategory] = useState(record.category ?? '');
  const [city, setCity] = useState(record.city);
  const [area, setArea] = useState(record.area ?? '');
  const [country, setCountry] = useState(record.country ?? 'Tanzania');
  const [address, setAddress] = useState(record.address ?? '');
  const [description, setDescription] = useState(record.description ?? '');
  const [images, setImages] = useState(record.cover_url ? [record.cover_url] : []);
  const [sourceUrl, setSourceUrl] = useState(record.source_url ?? '');
  const [error, setError] = useState<string | null>(null);
  const isProvider = kind === 'provider';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!images[0]) {
      setError('Upload a provider or store photo before saving.');
      return;
    }
    try {
      await onSave({
        name, category, city, area, country, address, description,
        imageUrl: images[0], sourceUrl,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The record could not be saved.');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4 border-t border-coffee/10 pt-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label={isProvider ? 'Provider or location name' : 'Store name'} value={name} onChange={setName} required />
        {isProvider ? <TextInput label="Service category" value={category} onChange={setCategory} required /> : null}
        <TextInput label="City" value={city} onChange={setCity} required />
        {isProvider ? <TextInput label="Area" value={area} onChange={setArea} required /> : <TextInput label="Country" value={country} onChange={setCountry} required />}
        <TextInput label="Street address (optional)" value={address} onChange={setAddress} />
        {isProvider ? <TextInput label="Official website or source URL (optional)" value={sourceUrl} onChange={setSourceUrl} type="url" /> : null}
      </div>
      <TextArea label="About this location" value={description} onChange={setDescription} required />
      <ImageUploadField label={isProvider ? 'Provider or business photo' : 'Store photo'} value={images} onChange={setImages} />
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <Button type="submit" disabled={saving}>{saving ? 'Saving details…' : 'Save location details'}</Button>
    </form>
  );
}
