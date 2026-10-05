'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Field } from '@/components/ui';

const DEMO = [
  { label: 'Resident (A-101)', email: 'aman@gva.com' },
  { label: 'Guard', email: 'guard@gva.com' },
  { label: 'Admin', email: 'admin@gva.com' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold text-brand-700">MyGate</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to your society</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-slate-500 mt-4">
          New here?{' '}
          <Link href="/register" className="text-brand-600 font-medium">
            Create account
          </Link>
        </p>
        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-slate-500 mb-2">Demo accounts (password: password123)</p>
          <div className="flex flex-wrap gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  setEmail(d.email);
                  setPassword('password123');
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
