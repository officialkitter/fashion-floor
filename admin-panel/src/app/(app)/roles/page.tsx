'use client';

import { Card, NoAccess, PageHeader, StatusBadge } from '@/components/ui';
import { PERMISSION_LABELS, ROLE_LABELS } from '@/lib/rbac';
import { useAccess } from '@/lib/store';

export default function RolesPage() {
  const { role, can } = useAccess();
  if (!role || !can('roles.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="role permissions" />;
  const groups = [...new Set(PERMISSION_LABELS.map((permission) => permission.group))];
  return (
    <>
      <PageHeader title="Role permissions" subtitle="Permissions are verified against the database for your signed-in account." />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone">Your database role</p>
            <h2 className="mt-1 text-xl font-extrabold text-coffee">{ROLE_LABELS[role]}</h2>
          </div>
          <StatusBadge status="active" label="Verified by Supabase" />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Card key={group}>
            <h3 className="mb-3 font-bold text-coffee">{group}</h3>
            <ul className="space-y-2">
              {PERMISSION_LABELS.filter((permission) => permission.group === group).map((permission) => (
                <li key={permission.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-charcoal">{permission.label}</span>
                  <StatusBadge status={can(permission.key) ? 'active' : 'inactive'} label={can(permission.key) ? 'Allowed' : 'Not allowed'} />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="mt-5 rounded-2xl bg-cream p-4 text-sm text-stone">This screen is informational. Permission decisions are enforced by Supabase row-level security and secure database functions, not by these UI indicators.</p>
    </>
  );
}
