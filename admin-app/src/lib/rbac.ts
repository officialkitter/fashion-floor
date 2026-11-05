export type Role = 'super_admin' | 'admin' | 'finance' | 'support' | 'supplier' | 'provider';

export type Permission =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.manage'
  | 'bookings.view'
  | 'bookings.manage'
  | 'catalog.view'
  | 'catalog.manage'
  | 'catalog.approve'
  | 'partners.view'
  | 'partners.manage'
  | 'team.view'
  | 'team.manage'
  | 'roles.view'
  | 'roles.edit'
  | 'finance.view';

export interface RoleMeta {
  label: string;
  scope: 'all' | 'own';
}

export const ROLE_META: Record<Role, RoleMeta> = {
  super_admin: { label: 'Owner', scope: 'all' },
  admin: { label: 'Admin', scope: 'all' },
  finance: { label: 'Finance', scope: 'all' },
  support: { label: 'Support', scope: 'all' },
  supplier: { label: 'Supplier', scope: 'own' },
  provider: { label: 'Service provider', scope: 'own' },
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    'dashboard.view', 'orders.view', 'orders.manage', 'bookings.view', 'bookings.manage',
    'catalog.view', 'catalog.manage', 'catalog.approve', 'partners.view', 'partners.manage', 'team.view',
    'team.manage', 'roles.view', 'roles.edit', 'finance.view',
  ],
  admin: [
    'dashboard.view', 'orders.view', 'orders.manage', 'bookings.view', 'bookings.manage',
    'catalog.view', 'catalog.manage', 'catalog.approve', 'partners.view', 'partners.manage', 'team.view',
    'team.manage', 'roles.view', 'finance.view',
  ],
  finance: ['dashboard.view', 'orders.view', 'bookings.view', 'finance.view', 'roles.view'],
  support: ['dashboard.view', 'orders.view', 'orders.manage', 'bookings.view', 'bookings.manage', 'catalog.view'],
  supplier: ['dashboard.view', 'orders.view', 'orders.manage', 'catalog.view', 'catalog.manage', 'finance.view'],
  provider: ['dashboard.view', 'bookings.view', 'bookings.manage', 'catalog.view', 'catalog.manage', 'finance.view'],
};
