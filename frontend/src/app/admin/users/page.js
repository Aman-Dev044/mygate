'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function UsersPage() {
  const { toast } = useAuth();
  const [users, setUsers] = useState([]);
  const [society, setSociety] = useState(null);
  const load = useCallback(() => api.get('/societies/users').then((r) => setUsers(r.data.users)), []);
  useEffect(() => {
    load();
    api.get('/societies/mine').then((r) => setSociety(r.data.society));
  }, [load]);

  const toggle = async (u) => {
    try {
      await api.patch(`/societies/users/${u._id}/approve`, { approved: !u.approved });
      toast(`${u.name} ${u.approved ? 'blocked' : 'activated'}`, 'success');
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  return (
    <AppShell>
      <PageTitle title="Members" subtitle={society ? `${society.name} · join code ${society.code}` : ''} />
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Name</th><th>Role</th><th>Flat</th><th>Phone</th><th>Email</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="py-2 font-medium">{u.name}</td>
                <td className="capitalize">{u.role}</td>
                <td>{u.flatNo || '-'}</td>
                <td>{u.phone}</td>
                <td className="text-slate-500">{u.email}</td>
                <td><Badge value={u.approved ? 'approved' : 'denied'}>{u.approved ? 'active' : 'blocked'}</Badge></td>
                <td className="text-right">{u.role !== 'admin' && <button className="text-xs text-brand-600" onClick={() => toggle(u)}>{u.approved ? 'Block' : 'Activate'}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
