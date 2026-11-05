'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Card, EmptyState, NoAccess, PageHeader, StatusBadge } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/rbac';
import type { Role } from '@/lib/rbac';
import { useAccess, useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';

type Department = { id: string; name: string };
type AccessRole = { id: string; department_id: string; name: string; is_active: boolean };
type Member = {
  user_id: string;
  role: Role;
  vendor_id: string | null;
  department_id: string | null;
  department_name: string | null;
  access_role_id: string | null;
  access_role_name: string | null;
  is_active: boolean;
  display_name: string | null;
  email: string | null;
};

const platformRoles: Role[] = ['admin', 'finance', 'support', 'supplier', 'provider'];
const selectionValue = (role: Role, customRoleId: string | null) => customRoleId ? `custom:${customRoleId}` : role;

export default function TeamPage() {
  const { role, can, user } = useAccess();
  const { partners } = useStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { role: string; departmentId: string; vendorId: string }>>({});
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newRole, setNewRole] = useState('support');
  const [newDepartment, setNewDepartment] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canManage = can('team.manage') && can('roles.edit');

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const [memberResult, departmentResult, roleResult] = await Promise.all([
      supabase.from('admin_team_members').select('*').order('created_at', { ascending: false }),
      supabase.from('departments').select('id,name').order('name'),
      supabase.from('access_roles').select('id,department_id,name,is_active').eq('is_active', true).order('name'),
    ]);
    const loadError = memberResult.error ?? departmentResult.error ?? roleResult.error;
    if (loadError) {
      setError(`Could not load team access: ${loadError.message}`);
      setLoading(false);
      return;
    }
    const nextMembers = (memberResult.data ?? []) as Member[];
    const nextDepartments = (departmentResult.data ?? []) as Department[];
    setMembers(nextMembers);
    setDepartments(nextDepartments);
    setAccessRoles((roleResult.data ?? []) as AccessRole[]);
    setAssignments(Object.fromEntries(nextMembers.map((member) => [member.user_id, {
      role: selectionValue(member.role, member.access_role_id),
      departmentId: member.department_id ?? '',
      vendorId: member.vendor_id ?? '',
    }])));
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const newRoleIsCustom = newRole.startsWith('custom:');
  const selectedNewAccessRole = useMemo(() =>
    newRoleIsCustom ? accessRoles.find((item) => item.id === newRole.slice(7)) : undefined,
  [accessRoles, newRole, newRoleIsCustom]);
  const requiresVendor = (value: string) => value === 'supplier' || value === 'provider';
  const availablePartners = partners.filter((partner) => partner.type === (newRole === 'provider' ? 'provider' : 'supplier'));

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (newRoleIsCustom && !selectedNewAccessRole) return setError('Choose an active role.');
    if (!newRoleIsCustom && requiresVendor(newRole) && !newVendor) return setError('Choose a supplier or provider account.');
    if (!newRoleIsCustom && !newDepartment && !requiresVendor(newRole)) return setError('Choose a department for this team member.');
    const supabase = getSupabase();
    if (!supabase) return setError('Supabase is not configured.');
    setSaving(true);
    const { data, error: inviteError } = await supabase.functions.invoke('admin-invite-user', {
      body: {
        email: email.trim(),
        displayName: displayName.trim(),
        platformRole: newRoleIsCustom ? 'support' : newRole,
        departmentId: selectedNewAccessRole?.department_id ?? (newDepartment || null),
        accessRoleId: selectedNewAccessRole?.id ?? null,
        vendorId: !newRoleIsCustom && requiresVendor(newRole) ? newVendor : null,
      },
    });
    setSaving(false);
    if (inviteError) return setError(inviteError.message);
    if (data?.error) return setError(String(data.error));
    setEmail('');
    setDisplayName('');
    setNotice(`Invitation sent to ${email.trim()}. They will receive a secure account setup link.`);
    await load();
  }

  async function updateMember(member: Member) {
    const assignment = assignments[member.user_id];
    if (!assignment) return;
    setError(null);
    setNotice(null);
    const customRole = assignment.role.startsWith('custom:');
    const selectedRole = customRole ? accessRoles.find((item) => item.id === assignment.role.slice(7)) : undefined;
    const targetRole = customRole ? 'support' : assignment.role;
    const targetVendorId = !customRole && requiresVendor(targetRole) ? assignment.vendorId || null : null;
    if (customRole && !selectedRole) return setError('Choose an active role.');
    if (!customRole && requiresVendor(targetRole) && !targetVendorId) return setError('Choose a supplier or provider account.');
    const supabase = getSupabase();
    if (!supabase) return setError('Supabase is not configured.');
    setSaving(true);
    const { error: saveError } = await supabase.rpc('assign_team_access', {
      target_user_id: member.user_id,
      target_role: targetRole,
      target_department_id: selectedRole?.department_id ?? (assignment.departmentId || null),
      target_access_role_id: selectedRole?.id ?? null,
      target_vendor_id: targetVendorId,
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setNotice(`Access updated for ${member.display_name || member.email || 'team member'}.`);
    await load();
  }

  async function setMemberActive(member: Member, isActive: boolean) {
    const supabase = getSupabase();
    if (!supabase) return setError('Supabase is not configured.');
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.rpc('set_team_member_active', {
      target_user_id: member.user_id,
      make_active: isActive,
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setNotice(`${member.display_name || member.email || 'Team member'} ${isActive ? 'reactivated' : 'suspended'}.`);
    await load();
  }

  if (!role || !can('team.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="team management" />;

  return (
    <>
      <PageHeader title="Team access" subtitle="Invite people, assign departments and roles, and manage account access." />
      {error ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {notice ? <p role="status" className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p> : null}

      {canManage ? (
        <Card className="mb-5">
          <h2 className="text-lg font-extrabold text-coffee">Invite a team member</h2>
          <p className="mt-1 text-sm text-stone">Invitations create a real Supabase account. New users receive only the permissions assigned here.</p>
          <form onSubmit={(event) => void inviteMember(event)} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input required type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Full name" className="rounded-xl border border-coffee/15 px-3 py-2 text-sm" />
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="rounded-xl border border-coffee/15 px-3 py-2 text-sm" />
            <select required value={newRole} onChange={(event) => setNewRole(event.target.value)} className="rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm">
              <optgroup label="Platform roles">
                {platformRoles.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
              </optgroup>
              <optgroup label="Department roles">
                {accessRoles.map((item) => <option key={item.id} value={`custom:${item.id}`}>{item.name}</option>)}
              </optgroup>
            </select>
            {newRoleIsCustom || !requiresVendor(newRole) ? (
              <select required={!newRoleIsCustom} value={selectedNewAccessRole?.department_id ?? newDepartment} onChange={(event) => setNewDepartment(event.target.value)} disabled={Boolean(selectedNewAccessRole)} className="rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm disabled:bg-mist">
                <option value="">Choose department</option>
                {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            ) : null}
            {!newRoleIsCustom && requiresVendor(newRole) ? (
              <select required value={newVendor} onChange={(event) => setNewVendor(event.target.value)} className="rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm">
                <option value="">Choose partner account</option>
                {availablePartners.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}
              </select>
            ) : null}
            <button disabled={saving} className="rounded-xl bg-coffee px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Sending…' : 'Send invitation'}</button>
          </form>
          {!departments.length ? <p className="mt-3 text-xs text-amber-800">Create a department before inviting a platform team member.</p> : null}
        </Card>
      ) : null}

      {loading ? <p role="status" className="mb-4 text-sm text-stone">Loading team members…</p> : null}
      {!loading && members.length === 0 ? <EmptyState title="No team members found" hint="Invite a Fashion Floor team member to get started." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {members.map((member) => {
          const assignment = assignments[member.user_id];
          const customRole = assignment?.role.startsWith('custom:') ?? false;
          const selectedRole = customRole ? accessRoles.find((item) => item.id === assignment?.role.slice(7)) : undefined;
          const targetNeedsVendor = !customRole && requiresVendor(assignment?.role ?? '');
          const protectedOwner = member.role === 'super_admin' && role !== 'super_admin';
          return (
            <Card key={member.user_id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-coffee">{member.display_name || 'Fashion Floor teammate'}</h2>
                  <p className="truncate text-sm text-stone">{member.email || 'Email unavailable'}</p>
                </div>
                <StatusBadge status={member.is_active ? 'active' : 'suspended'} label={member.is_active ? 'Active' : 'Suspended'} />
              </div>
              <p className="mt-3 text-xs text-stone">
                Current access: {member.access_role_name || ROLE_LABELS[member.role]}
                {member.department_name ? ` · ${member.department_name}` : ''}
              </p>
              {canManage && !protectedOwner ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <select value={assignment?.role ?? member.role} onChange={(event) => setAssignments((current) => ({
                    ...current,
                    [member.user_id]: { ...(current[member.user_id] ?? { role: member.role, departmentId: '', vendorId: '' }), role: event.target.value },
                  }))} className="rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm">
                    {role === 'super_admin' ? <option value="super_admin">{ROLE_LABELS.super_admin}</option> : null}
                    {platformRoles.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
                    {accessRoles.map((item) => <option key={item.id} value={`custom:${item.id}`}>{item.name}</option>)}
                  </select>
                  {targetNeedsVendor ? (
                    <select value={assignment?.vendorId ?? ''} onChange={(event) => setAssignments((current) => ({
                      ...current,
                      [member.user_id]: { ...(current[member.user_id] ?? { role: member.role, departmentId: '', vendorId: '' }), vendorId: event.target.value },
                    }))} className="rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm">
                      <option value="">Choose partner account</option>
                      {partners.filter((item) => item.type === assignment?.role).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  ) : (
                    <select value={selectedRole?.department_id ?? assignment?.departmentId ?? ''} disabled={Boolean(selectedRole)} onChange={(event) => setAssignments((current) => ({
                      ...current,
                      [member.user_id]: { ...(current[member.user_id] ?? { role: member.role, departmentId: '', vendorId: '' }), departmentId: event.target.value },
                    }))} className="rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm disabled:bg-mist">
                      <option value="">Choose department</option>
                      {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  )}
                  <button disabled={saving || member.user_id === user?.id} onClick={() => void updateMember(member)} className="rounded-xl bg-coffee px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save access</button>
                  <button disabled={saving || member.user_id === user?.id} onClick={() => void setMemberActive(member, !member.is_active)} className="rounded-xl bg-mist px-4 py-2 text-sm font-bold text-coffee disabled:opacity-50">{member.is_active ? 'Suspend access' : 'Restore access'}</button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </>
  );
}
