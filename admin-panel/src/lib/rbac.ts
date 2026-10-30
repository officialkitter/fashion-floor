export type Role = 'super_admin' | 'admin' | 'finance' | 'support' | 'supplier' | 'provider';
export type Permission =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.manage'
  | 'bookings.view'
  | 'bookings.manage'
  | 'catalog.view'
  | 'catalog.manage'
  | 'partners.view'
  | 'partners.manage'
  | 'team.view'
  | 'team.manage'
  | 'roles.view'
  | 'roles.edit'
  | 'finance.view';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Platform administrator',
  admin: 'Administrator',
  finance: 'Finance',
  support: 'Support',
  supplier: 'Supplier',
  provider: 'Service provider',
};

export const PERMISSION_LABELS: { key: Permission; label: string; group: string }[] = [
  { key: 'dashboard.view', label: 'View overview', group: 'Overview' },
  { key: 'orders.view', label: 'View orders', group: 'Orders' },
  { key: 'orders.manage', label: 'Update orders', group: 'Orders' },
  { key: 'bookings.view', label: 'View appointments', group: 'Appointments' },
  { key: 'bookings.manage', label: 'Update appointments', group: 'Appointments' },
  { key: 'catalog.view', label: 'View product catalog', group: 'Catalog' },
  { key: 'catalog.manage', label: 'Manage catalog', group: 'Catalog' },
  { key: 'partners.view', label: 'View suppliers and providers', group: 'Partners' },
  { key: 'partners.manage', label: 'Manage partners', group: 'Partners' },
  { key: 'team.view', label: 'View team', group: 'Team' },
  { key: 'team.manage', label: 'Manage team', group: 'Team' },
  { key: 'roles.view', label: 'View role permissions', group: 'Access' },
  { key: 'roles.edit', label: 'Edit role permissions', group: 'Access' },
  { key: 'finance.view', label: 'View financial amounts', group: 'Finance' },
];
