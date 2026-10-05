'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Field } from '@/components/ui';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    societyCode: 'GVA001',
    role: 'resident',
    tower: '',
    flatNo: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
    } catch (err) {
      setError(err.userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold text-brand-700">Create account</h1>
        <p className="text-sm text-slate-500 mb-6">Join your society with its code</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Full name">
            <input className="input" value={form.name} onChange={set('name')} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input className="input" type="email" value={form.email} onChange={set('email')} required />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.phone} onChange={set('phone')} required />
            </Field>
          </div>
          <Field label="Password (min 6)">
            <input className="input" type="password" value={form.password} onChange={set('password')} minLength={6} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Society code">
              <input className="input uppercase" value={form.societyCode} onChange={set('societyCode')} required />
            </Field>
            <Field label="I am a">
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="resident">Resident</option>
                <option value="guard">Security guard</option>
              </select>
            </Field>
          </div>
          {form.role === 'resident' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tower">
                <input className="input" value={form.tower} onChange={set('tower')} placeholder="A" />
              </Field>
              <Field label="Flat no">
                <input className="input" value={form.flatNo} onChange={set('flatNo')} placeholder="A-101" required />
              </Field>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-slate-500 mt-4">
          Already registered?{' '}
          <Link href="/login" className="text-brand-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
