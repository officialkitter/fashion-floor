'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Button, Card } from '@/components/ui';
import { getSupabase } from '@/lib/supabase';

type ImportRow = {
  brand_name: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  original_price: number | null;
  colors: string[];
  sizes: { size: string; stock: number }[];
  images: string[];
};

type StoreOption = { id: string; name: string; city: string; approval_status: string };
const HEADERS = [
  'brand_name', 'title', 'description', 'category', 'price', 'currency',
  'original_price', 'colors', 'stock_by_size', 'image_urls',
];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 250;

const textCell = (cell: ExcelJS.Cell) => String(cell.text ?? '').trim();

function parseWorkbook(workbook: ExcelJS.Workbook): ImportRow[] {
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The workbook has no worksheet.');
  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => headers.set(textCell(cell).toLowerCase().trim(), column));
  const missing = ['brand_name', 'title', 'description', 'category', 'price', 'stock_by_size']
    .filter((header) => !headers.has(header));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}. Download the template for the required layout.`);

  const rows: ImportRow[] = [];
  const errors: string[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (row.actualCellCount === 0) continue;
    const get = (header: string) => {
      const column = headers.get(header);
      return column ? row.getCell(column) : undefined;
    };
    const cellText = (header: string) => {
      const cell = get(header);
      return cell ? textCell(cell) : '';
    };
    const priceCell = get('price');
    const originalCell = get('original_price');
    const price = priceCell?.value == null ? Number.NaN
      : typeof priceCell.value === 'number' ? priceCell.value
        : Number(textCell(priceCell).replace(/,/g, ''));
    const originalRaw = originalCell?.value == null ? '' : textCell(originalCell);
    const originalPrice = originalRaw ? Number(originalRaw.replace(/,/g, '')) : null;
    const sizes = cellText('stock_by_size').split('|').map((token) => {
      const [size, stockText] = token.split(':');
      return { size: size?.trim() ?? '', stock: stockText?.trim() ? Number(stockText) : Number.NaN };
    });
    const cleanedSizes = sizes.filter((item) => item.size || Number.isFinite(item.stock));
    const images = cellText('image_urls').split('|').map((url) => url.trim()).filter(Boolean);
    const required = ['brand_name', 'title', 'description', 'category'].filter((field) => !cellText(field));
    if (required.length) errors.push(`Row ${rowNumber}: missing ${required.join(', ')}.`);
    if (!Number.isFinite(price) || price <= 0) errors.push(`Row ${rowNumber}: price must be greater than zero.`);
    if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price)) {
      errors.push(`Row ${rowNumber}: original_price must be at least the selling price.`);
    }
    if (!cleanedSizes.length || cleanedSizes.some((item) => !item.size || !Number.isInteger(item.stock) || item.stock < 0)) {
      errors.push(`Row ${rowNumber}: stock_by_size must look like S:4 | M:2.`);
    }
    if (new Set(cleanedSizes.map((item) => item.size.toLowerCase())).size !== cleanedSizes.length) {
      errors.push(`Row ${rowNumber}: size names must not repeat.`);
    }
    if (images.some((url) => !/^https?:\/\//i.test(url))) errors.push(`Row ${rowNumber}: each image URL must start with http:// or https://.`);
    if (errors.length >= 12) break;
    rows.push({
      brand_name: cellText('brand_name'),
      title: cellText('title'),
      description: cellText('description'),
      category: cellText('category'),
      price,
      currency: cellText('currency') || 'TZS',
      original_price: originalPrice,
      colors: cellText('colors').split(/[|,]/).map((color) => color.trim()).filter(Boolean),
      sizes: cleanedSizes,
      images,
    });
  }
  if (!rows.length && !errors.length) throw new Error('The worksheet has no product rows.');
  if (rows.length > MAX_ROWS) errors.push(`Import up to ${MAX_ROWS} products at a time.`);
  if (errors.length) throw new Error(errors.join('\n'));
  return rows;
}

export function BulkProductImport({ onImported }: { onImported: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [loadingStores, setLoadingStores] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoadingStores(false);
      return;
    }
    void (async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('admin_stores')
          .select('id,name,city,approval_status')
          .order('name');
        if (!active) return;
        if (queryError) setError(`Could not load your store list: ${queryError.message}`);
        else {
          const options = (data ?? []) as StoreOption[];
          setStores(options);
          if (options.length === 1) setStoreId(options[0].id);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load your store list.');
      } finally {
        if (active) setLoadingStores(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function downloadTemplate() {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Products');
      sheet.addRow(HEADERS);
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E2A21' } };
      sheet.columns = HEADERS.map((header) => ({ header, key: header, width: Math.max(18, header.length + 4) }));
      const instructions = workbook.addWorksheet('Instructions');
      instructions.addRows([
        ['Fashion Floor bulk product import'],
        ['Complete one product per row on the Products sheet.'],
        ['Required: brand_name, title, description, category, price, stock_by_size.'],
        ['price and original_price are major currency units (for example 85000 TZS).'],
        ['stock_by_size format: XS:2 | S:4 | M:3. Quantities must be physically on hand.'],
        ['image_urls accepts direct image links separated by |. Photos can also be added after import in Product details.'],
        ['currency defaults to TZS. colors accepts comma or | separated values.'],
        ['Every import creates private review drafts; prices are unconfirmed and brand names are unverified.'],
        [`Maximum ${MAX_ROWS} products per upload.`],
      ]);
      instructions.getColumn(1).width = 110;
      instructions.getColumn(1).alignment = { wrapText: true };
      const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fashion-floor-product-import-template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The Excel template could not be created.');
    }
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setError(null);
    setMessage(null);
    setRows([]);
    setFileName('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Upload an Excel workbook in .xlsx format.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('The workbook must be smaller than 10 MB.');
      return;
    }
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const parsed = parseWorkbook(workbook);
      setRows(parsed);
      setFileName(file.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The workbook could not be read.');
    }
  }

  async function importProducts() {
    const supabase = getSupabase();
    if (!supabase || !storeId || !rows.length) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: importError } = await supabase.rpc('import_product_drafts', {
        target_store_id: storeId,
        product_rows: rows,
      });
      if (importError) throw new Error(importError.message);
      await onImported();
      setMessage(`${Number(data)} product drafts added. They remain hidden until details and brand authorization are verified and approved.`);
      setRows([]);
      setFileName('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The products could not be imported.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-coffee"><FileSpreadsheet size={19} aria-hidden="true" /><h2 className="text-lg font-bold">Add products from Excel</h2></div>
          <p className="mt-1 max-w-2xl text-sm text-stone">Import up to {MAX_ROWS} products into one of your stores. Imports are saved as private drafts; photos, prices, stock, and brand authorization can be reviewed before publication.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void downloadTemplate()}><Download size={15} aria-hidden="true" /> Download template</Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto_auto] md:items-end">
        <label className="block text-sm font-semibold text-coffee">
          Store
          <select value={storeId} onChange={(event) => setStoreId(event.target.value)} disabled={loadingStores || busy} className="mt-1 h-11 w-full rounded-xl border border-coffee/15 bg-white px-3 text-sm font-normal text-charcoal">
            <option value="">{loadingStores ? 'Loading stores…' : 'Choose a store'}</option>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name} · {store.city} · {store.approval_status}</option>)}
          </select>
        </label>
        <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void readFile(event)} className="sr-only" />
        <Button type="button" variant="secondary" disabled={busy || loadingStores || stores.length === 0} onClick={() => inputRef.current?.click()}><Upload size={15} aria-hidden="true" /> Select workbook</Button>
        <Button type="button" disabled={busy || !storeId || !rows.length} onClick={() => void importProducts()}>
          {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet size={15} aria-hidden="true" />}
          {busy ? 'Importing…' : `Import ${rows.length || ''} products`}
        </Button>
      </div>
      {fileName ? <p className="mt-3 text-sm font-semibold text-coffee">{fileName} · {rows.length} valid product rows</p> : null}
      {!loadingStores && !stores.length ? <p className="mt-3 text-sm text-amber-900">No stores are available to your account. Ask an administrator to link you to a store.</p> : null}
      {error ? <p role="alert" className="mt-3 whitespace-pre-line rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {message ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p> : null}
    </Card>
  );
}
