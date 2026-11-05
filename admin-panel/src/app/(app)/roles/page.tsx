'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Card, NoAccess, PageHeader, StatusBadge } from '@/components/ui';
import { PERMISSION_LABELS, ROLE_LABELS } from '@/lib/rbac';
import type { Permission } from '@/lib/rbac';
import { useAccess } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';

type Department = { id: string; name: string; slug: string; is_active: boolean };
type AccessRole = {
  id: string;
  department_id: string;
  name: string;
  slug: string;
  permissions: string[];
  is_active: boolean;
};

const reservedPermissions: Permission[] = ['partners.manage', 'team.view', 'team.manage', 'roles.edit'];
const editablePermissions = PERMISSION_LABELS.filter(
  (item) => item.key !== 'roles.view' && !reservedPermissions.includes(item.key),
);

export default function RolesPage() {
  const { role, can } = useAccess();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [departmentName, setDepartmentName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = can('roles.edit') && can('team.manage');

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const [departmentResult, roleResult] = await Promise.all([
      supabase.from('departments').select('id,name,slug,is_active').order('name'),
      supabase.from('access_roles').select('id,department_id,name,slug,permissions,is_active').order('name'),
    ]);
    if (departmentResult.error || roleResult.error) {
      setError(`Could not load departments and roles: ${departmentResult.error?.message ?? roleResult.error?.message}`);
    } else {
      setError(null);
      setDepartments((departmentResult.data ?? []) as Department[]);
      setAccessRoles((roleResult.data ?? []) as AccessRole[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groupedRoles = useMemo(() => departments.map((department) => ({
    department,
    roles: accessRoles.filter((item) => item.department_id === department.id),
  })), [accessRoles, departments]);

  async function saveDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const supabase = getSupabase();
    if (!supabase) return setError('Supabase is not configured.');
    setSaving(true);
    const { error: saveError } = await supabase.rpc('save_department', {
      target_department_id: null,
      department_name: departmentName.trim(),
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setDepartmentName('');
    setMessage('Department added.');
    await load();
  }

  async function saveAccessRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!departmentId) return setError('Choose a department for this role.');
    if (!selectedPermissions.length) return setError('Select at least one permission.');
    const supabase = getSupabase();
    if (!supabase) return setError('Supabase is not configured.');
    setSaving(true);
    const { error: saveError } = await supabase.rpc('save_access_role', {
      target_access_role_id: editingRole,
      target_department_id: departmentId,
      access_role_name: roleName.trim(),
      selected_permissions: selectedPermissions,
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setRoleName('');
    setSelectedPermissions([]);
    setEditingRole(null);
    setMessage('Role saved. Assign it to a team member from Team access.');
    await load();
  }

  function editAccessRole(item: AccessRole) {
    setEditingRole(item.id);
    setRoleName(item.name);
    setDepartmentId(item.department_id);
    setSelectedPermissions(item.permissions.filter((key): key is Permission =>
      editablePermissions.some((permission) => permission.key === key),
    ));
  }

  if (!role || !can('roles.view')) return <NoAccess role={role ? ROLE_LABELS[role] : 'your role'} what="role permissions" />;

  return (
    <>
      <PageHeader title="Departments and roles" subtitle="Create departments and define access for each team role. Database policies enforce every permission." />
      {error ? <p role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {message ? <p role="status" className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p> : null}

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone">Your database role</p>
            <h2 className="mt-1 text-xl font-extrabold text-coffee">{ROLE_LABELS[role]}</h2>
          </div>
          <StatusBadge status="active" label="Verified by Supabase" />
        </div>
      </Card>

      {canEdit ? (
        <div className="mb-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <h2 className="text-lg font-extrabold text-coffee">Add a department</h2>
            <p className="mt-1 text-sm text-stone">Departments help organize the Fashion Floor team.</p>
            <form onSubmit={(event) => void saveDepartment(event)} className="mt-4 flex flex-wrap gap-2">
              <input required value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="e.g. Marketing" className="min-w-0 flex-1 rounded-xl border border-coffee/15 px-3 py-2 text-sm" />
              <button disabled={saving} className="rounded-xl bg-coffee px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Add department</button>
            </form>
          </Card>

          <Card>
            <h2 className="text-lg font-extrabold text-coffee">{editingRole ? 'Edit team role' : 'Create a team role'}</h2>
            <p className="mt-1 text-sm text-stone">Administrative permissions remain reserved for platform administrators.</p>
            <form onSubmit={(event) => void saveAccessRole(event)} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input required value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="e.g. Marketing officer" className="rounded-xl border border-coffee/15 px-3 py-2 text-sm" />
                <select required value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="rounded-xl border border-coffee/15 bg-white px-3 py-2 text-sm">
                  <option value="">Choose department</option>
                  {departments.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {editablePermissions.map((permission) => (
                  <label key={permission.key} className="flex items-center gap-2 rounded-xl bg-cream/70 px-3 py-2 text-sm text-charcoal">
                    <input type="checkbox" checked={selectedPermissions.includes(permission.key)} onChange={(event) => setSelectedPermissions((current) =>
                      event.target.checked
                        ? [...current, permission.key]
                        : current.filter((item) => item !== permission.key),
                    )} />
                    {permission.label}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button disabled={saving} className="rounded-xl bg-coffee px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{editingRole ? 'Save changes' : 'Create role'}</button>
                {editingRole ? <button type="button" onClick={() => { setEditingRole(null); setRoleName(''); setSelectedPermissions([]); }} className="rounded-xl bg-mist px-4 py-2 text-sm font-bold text-coffee">Cancel</button> : null}
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {loading ? <p role="status" className="mb-4 text-sm text-stone">Loading departments and roles…</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groupedRoles.map(({ department, roles: items }) => (
          <Card key={department.id}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-coffee">{department.name}</h2>
              <StatusBadge status={department.is_active ? 'active' : 'inactive'} />
            </div>
            {!items.length ? <p className="mt-3 text-sm text-stone">No custom roles in this department yet.</p> : null}
            <ul className="mt-3 space-y-3">
              {items.map((item) => (
                <li key={item.id} className="border-t border-coffee/10 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-charcoal">{item.name}</h3>
                    {canEdit ? <button type="button" onClick={() => editAccessRole(item)} className="text-xs font-bold text-coffee underline">Edit</button> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-stone">{item.permissions.map((key) => editablePermissions.find((permission) => permission.key === key)?.label ?? key).join(' · ') || 'No permissions assigned'}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {!loading && departments.length === 0 ? <Card className="text-sm text-stone">No departments are configured yet.</Card> : null}
    </>
  );
}
