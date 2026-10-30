export const money = (n: number, currency?: string) =>
  currency
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

export const statusLabel = (status: string) =>
  status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const ago = (iso: string, now: number) => {
  const mins = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
};

/** Restricted roles never see a customer's full email. */
export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return '••••';
  return `${name.slice(0, 1)}•••@${domain}`;
};
