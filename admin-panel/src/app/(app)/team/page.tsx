'use client';

import { Users } from 'lucide-react';
import { Card, NoAccess, PageHeader } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import { useAccess } from '@/lib/store';

export default function TeamPage() {
  const { role, can } = useAccess();
  if (!role || !can('team.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="team management" />;
  return (
    <>
      <PageHeader title="Team" subtitle="Team member administration is not available in this panel." />
      <Card className="max-w-2xl">
        <Users size={24} className="text-lounge" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-bold text-coffee">Secure invitations are not backed by the shared schema</h2>
        <p className="mt-2 text-sm leading-6 text-stone">The database supports role assignment for existing accounts, but this project has no secure user-invitation or account-creation flow. To avoid fabricated users or insecure access changes, this page does not list, invite, suspend, or edit team accounts.</p>
      </Card>
    </>
  );
}
