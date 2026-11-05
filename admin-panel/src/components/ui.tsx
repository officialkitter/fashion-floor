'use client';

import { AnimatePresence, HTMLMotionProps, animate, motion, useReducedMotion } from 'framer-motion';
import { LockKeyhole, X } from 'lucide-react';
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/* ---------- Button (shrinks to 0.96 on press, springs back) ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-coffee text-white hover:bg-charcoal',
  secondary: 'bg-white text-coffee ring-1 ring-coffee/15 hover:ring-coffee',
  ghost: 'bg-transparent text-coffee hover:bg-mist',
  danger: 'bg-white text-crimson ring-1 ring-crimson/30 hover:bg-crimson hover:text-white',
  success: 'bg-mint text-white hover:brightness-95',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: HTMLMotionProps<'button'> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      type={type}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lounge disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' && 'h-9 px-4 text-xs',
        size === 'md' && 'h-11 px-5 text-sm',
        size === 'lg' && 'h-14 px-7 text-base',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Layout bits ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-3xl bg-white p-5 shadow-card ring-1 ring-black/5', className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-xl text-sm text-slate">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full bg-mist object-cover"
    />
  );
}

export function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={cn('bg-mist object-cover', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-mist px-6 py-14 text-center">
      <div className="mb-3 h-12 w-12 rounded-full bg-white shadow-card" />
      <p className="text-base font-bold text-ink">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-slate">{hint}</p> : null}
    </div>
  );
}

/* ---------- Status badge: colour is for meaning only ---------- */
const TONES: Record<string, { color: string; label?: string }> = {
  paid: { color: '#315B45', label: 'Paid' },
  booked: { color: '#315B45', label: 'Booked' },
  confirmed: { color: '#315B45', label: 'Confirmed' },
  verified: { color: '#315B45', label: 'Verified' },
  approved: { color: '#315B45', label: 'Approved' },
  published: { color: '#315B45', label: 'Approved' },
  active: { color: '#315B45', label: 'Active' },
  available: { color: '#315B45', label: 'Available' },
  in_stock: { color: '#315B45', label: 'In stock' },
  pending: { color: '#B87932', label: 'Pending' },
  awaiting_source: { color: '#B87932', label: 'Awaiting source' },
  contacted: { color: '#B87932', label: 'Contacted' },
  processing: { color: '#B87932', label: 'Processing' },
  invited: { color: '#B87932', label: 'Invited' },
  low_stock: { color: '#B87932', label: 'Low stock' },
  cancelled: { color: '#A33B32', label: 'Cancelled' },
  suspended: { color: '#A33B32', label: 'Suspended' },
  rejected: { color: '#A33B32', label: 'Rejected' },
  out_of_stock: { color: '#A33B32', label: 'Sold out' },
  completed: { color: '#766B60', label: 'Completed' },
  away: { color: '#766B60', label: 'Away' },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const t: { color: string; label?: string } = TONES[status] ?? { color: '#8E8E93' };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-charcoal">
      <i className="h-2 w-2 rounded-full" style={{ background: t.color }} />
      {label ?? t.label ?? status}
    </span>
  );
}

/* ---------- Segmented tabs with a sliding pill ---------- */
export function Tabs<T extends string>({
  id,
  value,
  onChange,
  items,
}: {
  id: string;
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="thin-scroll inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-mist p-1" role="tablist">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn('relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors', active ? 'text-white' : 'text-slate hover:text-ink')}
          >
            {active ? (
              <motion.span
                layoutId={`tab-${id}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-2">
              {it.label}
              {it.count ? (
                <span className={cn('rounded-full px-1.5 text-[11px]', active ? 'bg-white/20' : 'bg-white')}>{it.count}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Count-up numbers ---------- */
export function CountUp({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const [text, setText] = useState(() => format(0));
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setText(format(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span>{text}</span>;
}

/* ---------- Modal & side drawer ---------- */
function Overlay({ open, onClose, children, side }: { open: boolean; onClose: () => void; children: ReactNode; side?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn('fixed inset-0 z-50 flex', side ? 'justify-end' : 'items-end justify-center p-0 sm:items-center sm:p-6')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SheetHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 px-6 py-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate">{subtitle}</p> : null}
      </div>
      <button onClick={onClose} aria-label="Close" className="rounded-full bg-mist p-2 text-ink hover:bg-ink hover:text-white">
        <X size={18} />
      </button>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Overlay open={open} onClose={onClose}>
      <motion.div
        role="dialog"
        aria-modal
        aria-label={title}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-4xl bg-white shadow-lift sm:rounded-4xl"
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <SheetHeader title={title} subtitle={subtitle} onClose={onClose} />
        <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-3 border-t border-black/5 bg-mist/60 px-6 py-4">{footer}</div> : null}
      </motion.div>
    </Overlay>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Overlay open={open} onClose={onClose} side>
      <motion.aside
        role="dialog"
        aria-modal
        aria-label={title}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-lift"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      >
        <SheetHeader title={title} subtitle={subtitle} onClose={onClose} />
        <div className="thin-scroll flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap gap-3 border-t border-black/5 bg-mist/60 px-6 py-4">{footer}</div> : null}
      </motion.aside>
    </Overlay>
  );
}

/* ---------- Form fields ---------- */
export const inputCls =
  'h-12 w-full rounded-2xl bg-mist px-4 text-sm text-ink outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-ink placeholder:text-slate';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate">{hint}</span> : null}
    </label>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40', checked ? 'bg-ink' : 'bg-[#D1D1D6]')}
    >
      <motion.span
        className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

/* ---------- Toasts ---------- */
interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const reducedMotion = useReducedMotion();
  const push = useCallback((text: string, tone: Toast['tone'] = 'good') => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, text, tone }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={reducedMotion ? false : { y: 18, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex items-center gap-3 rounded-full bg-coffee py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-lift"
            >
              <i
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: t.tone === 'good' ? '#315B45' : t.tone === 'bad' ? '#A33B32' : '#766B60' }}
              />
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Friendly "no access" screen ---------- */
export function NoAccess({ role, what }: { role: string; what: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-4xl bg-mist p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-coffee text-white"><LockKeyhole size={24} aria-hidden="true" /></div>
      <h2 className="text-xl font-extrabold text-coffee">This area is not part of your role</h2>
      <p className="mt-2 text-sm text-slate">
        As <b className="text-coffee">{role}</b> you can&apos;t open {what}. If you think this is a mistake, ask an administrator to
        change your role.
      </p>
    </div>
  );
}
