'use client';

import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export function ImageUploadField({
  label,
  value,
  onChange,
  multiple = false,
}: {
  label: string;
  value: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const invalid = selected.find((file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE);
    if (invalid) {
      setError(`${invalid.name}: choose JPG, PNG, WebP, or AVIF under 5 MB.`);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError('Image storage is not configured.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const path = `${(await supabase.auth.getUser()).data.user?.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('product-media').upload(path, file, {
          cacheControl: '31536000',
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw new Error(uploadError.message);
        const { data } = supabase.storage.from('product-media').getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      onChange(multiple ? [...value, ...uploaded] : uploaded.slice(0, 1));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The image could not be uploaded.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-coffee">{label}</p>
      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${label} ${index + 1}`} className="h-20 w-20 rounded-xl object-cover ring-1 ring-coffee/10" />
            <button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${label} ${index + 1}`} className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-700 shadow">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
        {(multiple || value.length === 0) ? (
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex h-20 min-w-20 items-center justify-center gap-2 rounded-xl border border-dashed border-coffee/30 px-3 text-xs font-semibold text-coffee disabled:opacity-60">
            {uploading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}
            {uploading ? 'Uploading' : 'Add photo'}
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={multiple} onChange={(event) => void uploadFiles(event.currentTarget.files)} className="sr-only" />
      {error ? <p role="alert" className="mt-2 text-xs text-red-800">{error}</p> : null}
    </div>
  );
}
