'use client';

import { ArrowRight, Coffee } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Field, inputCls } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { login, configMissing, authError } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await login(email, password);
    setBusy(false);
    if (result.ok) router.replace('/dashboard');
    else setError(result.reason ?? 'Sign-in failed. Please try again.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <section className="w-full max-w-md rounded-4xl bg-white p-7 shadow-card sm:p-10">
        <div className="mb-8 flex items-center gap-3 text-coffee">
          <span className="rounded-2xl bg-coffee p-3 text-white"><Coffee size={22} aria-hidden="true" /></span>
          <div>
            <p className="text-sm font-bold tracking-[0.2em]">FASHION FLOOR</p>
            <p className="text-xs text-stone">Boutique & Lounge administration</p>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-coffee">Sign in</h1>
        <p className="mt-2 text-sm text-stone">Use your Fashion Floor work email and password.</p>

        {configMissing ? (
          <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            Supabase is not configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>admin-panel/.env.local</code>, then restart the app.
          </p>
        ) : null}
        {error || authError ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error ?? authError}</p> : null}

        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field label="Email">
            <input required className={inputCls} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password">
            <input required className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy || configMissing}>
            {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </form>
      </section>
    </main>
  );
}
