'use client';

import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button, Card, PageHeader } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function SettingsPage() {
  const { user, changePassword } = useStore();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 12) {
      setError('Use at least 12 characters for your new password.');
      return;
    }
    if (password !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage('Your password has been updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The password could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Account settings" subtitle="Manage your Fashion Floor sign-in and security." />
      <Card className="max-w-2xl">
        <div className="flex items-start gap-4">
          <span className="rounded-2xl bg-mist p-3 text-coffee"><KeyRound size={22} aria-hidden="true" /></span>
          <div>
            <h2 className="text-lg font-bold text-coffee">Change password</h2>
            <p className="mt-1 text-sm text-stone">Signed in as {user?.email || 'your account'}. Choose a unique password with at least 12 characters.</p>
          </div>
        </div>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-charcoal">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-stone/20 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-coffee focus:ring-2 focus:ring-coffee/10" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-charcoal">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" required minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-2xl border border-stone/20 bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-coffee focus:ring-2 focus:ring-coffee/10" />
          </div>
          {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
          {message ? <p role="status" className="rounded-2xl bg-mint/10 p-3 text-sm font-semibold text-coffee">{message}</p> : null}
          <Button type="submit" disabled={saving}>{saving ? 'Updating password…' : 'Update password'}</Button>
        </form>
      </Card>
    </>
  );
}
