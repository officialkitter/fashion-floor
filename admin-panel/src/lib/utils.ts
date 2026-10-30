export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const money = (n: number, currency = 'TZS') =>
  new Intl.NumberFormat('en-TZ', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

export const compact = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const ago = (iso: string, now = Date.now()) => {
  const mins = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
};

/** Hides most of an email so restricted roles never see full contact details. */
export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return '••••';
  return `${name.slice(0, 1)}•••@${domain}`;
};

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
