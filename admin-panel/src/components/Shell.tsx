'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, Coffee, LayoutDashboard, LogOut, Menu, Package, Settings, ShieldCheck, ShoppingBag, Store, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { ROLE_LABELS, type Permission } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const NAV: { href: string; label: string; icon: LucideIcon; perm: Permission }[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, perm: 'dashboard.view' },
  { href: '/orders', label: 'Orders', icon: ShoppingBag, perm: 'orders.view' },
  { href: '/bookings', label: 'Appointments', icon: CalendarDays, perm: 'bookings.view' },
  { href: '/catalog', label: 'Boutique catalog', icon: Package, perm: 'catalog.view' },
  { href: '/partners', label: 'Suppliers & providers', icon: Store, perm: 'partners.view' },
  { href: '/settings', label: 'Account settings', icon: Settings, perm: 'dashboard.view' },
  { href: '/team', label: 'Team', icon: Users, perm: 'team.view' },
  { href: '/roles', label: 'Role permissions', icon: ShieldCheck, perm: 'roles.view' },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, can } = useAccess();
  const { logout } = useStore();
  return (
    <div className="flex h-full flex-col bg-coffee p-5 text-white">
      <Link href="/dashboard" className="mb-9 flex items-center gap-3 px-2 text-sm font-extrabold tracking-[0.17em]" onClick={onNavigate}>
        <Coffee size={21} aria-hidden="true" /> FASHION FLOOR
      </Link>
      <nav aria-label="Main navigation" className="flex-1 space-y-1">
        {NAV.filter((item) => can(item.perm)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white', active ? 'bg-white text-coffee' : 'text-white/75 hover:bg-white/10 hover:text-white')}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
            </Link>
          );
        })}
      </nav>
      {user && role ? (
        <div className="rounded-3xl bg-white/10 p-4">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="mt-1 truncate text-xs text-white/70">{ROLE_LABELS[role]}</p>
          <button onClick={async () => { await logout(); router.replace('/login'); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-2.5 text-xs font-bold transition hover:bg-white hover:text-coffee">
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block"><Navigation /></aside>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-coffee px-5 py-4 text-white lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-extrabold tracking-[0.15em]"><Coffee size={18} aria-hidden="true" /> FASHION FLOOR</Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open navigation menu" aria-expanded={open} className="rounded-full bg-white/10 p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><Menu size={20} /></button>
      </header>
      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0 }}>
            <button type="button" className="absolute inset-0 h-full w-full bg-black/50" aria-label="Close navigation menu" onClick={() => setOpen(false)} />
            <motion.div className="relative h-full w-72 max-w-[85%]" initial={reducedMotion ? false : { x: '-100%' }} animate={{ x: 0 }} exit={reducedMotion ? undefined : { x: '-100%' }}>
              <Navigation onNavigate={() => setOpen(false)} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-full bg-white/10 p-2 text-white"><X size={18} /></button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <main className="min-w-0">
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pathname} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
