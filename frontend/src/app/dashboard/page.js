'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, Stat, PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { fmtTime, money } from '@/lib/api';

function ResidentHome() {
  const { user, toast, subscribe } = useAuth();
  const [pending, setPending] = useState([]);
  const [bills, setBills] = useState({ bills: [], totalDue: 0 });
  const [notices, setNotices] = useState([]);
  const [helps, setHelps] = useState([]);

  const load = useCallback(async () => {
    const [v, b, n, h] = await Promise.all([
      api.get('/visitors?status=pending'),
      api.get('/bills'),
      api.get('/community/notices'),
      api.get('/daily-help'),
    ]);
    setPending(v.data.visitors);
    setBills(b.data);
    setNotices(n.data.notices.slice(0, 3));
    setHelps(h.data.helps);
  }, []);

  useEffect(() => {
    load();
    return subscribe(() => load());
  }, [load, subscribe]);

  const respond = async (id, action) => {
    try {
      await api.patch(`/visitors/${id}/respond`, { action });
      toast(`Visitor ${action === 'approve' ? 'approved' : 'denied'}`, 'success');
      load();
    } catch (e) {
      toast(e.userMessage, 'error');
    }
  };

  return (
    <>
      <PageTitle title={`Hello, ${user.name.split(' ')[0]}`} subtitle={`Flat ${user.flatNo}`} />
      {pending.length > 0 && (
        <div className="mb-6 space-y-3">
          {pending.map((v) => (
            <div key={v._id} className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {v.name} {v.company ? `(${v.company})` : ''} <Badge value={v.type} />
                </p>
                <p className="text-sm text-slate-600">Waiting at gate since {fmtTime(v.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-success" onClick={() => respond(v._id, 'approve')}>
                  Allow
                </button>
                <button className="btn-danger" onClick={() => respond(v._id, 'deny')}>
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Pending dues" value={money(bills.totalDue)} hint={`${bills.bills.filter((b) => b.status !== 'paid').length} unpaid bills`} />
        <Stat label="Daily help inside" value={helps.filter((h) => h.isInside).length} hint={`${helps.length} registered`} />
        <Stat label="Visitors at gate" value={pending.length} />
        <Stat label="Notices" value={notices.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/visitors" className="btn-primary">Pre-approve visitor</Link>
            <Link href="/complaints" className="btn-secondary">Raise complaint</Link>
            <Link href="/bills" className="btn-secondary">Pay bills</Link>
            <Link href="/amenities" className="btn-secondary">Book amenity</Link>
          </div>
        </Card>
        <Card title="Latest notices">
          {notices.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-3">
              {notices.map((n) => (
                <li key={n._id}>
                  <p className="font-medium text-sm">
                    {n.pinned && '📌 '}
                    {n.title} <Badge value={n.category} />
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function GuardHome() {
  const { subscribe } = useAuth();
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState([]);
  const load = useCallback(async () => {
    const [s, v] = await Promise.all([api.get('/societies/stats'), api.get('/visitors?limit=10')]);
    setStats(s.data);
    setRecent(v.data.visitors);
  }, []);
  useEffect(() => {
    load();
    return subscribe(() => load());
  }, [load, subscribe]);

  return (
    <>
      <PageTitle title="Gate dashboard" action={<Link href="/visitors" className="btn-primary">Open gate console</Link>} />
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat label="Awaiting resident approval" value={stats.pendingVisitors ?? '-'} />
        <Stat label="Visitors inside" value={stats.insideVisitors ?? '-'} />
        <Stat label="Residents" value={stats.residents ?? '-'} />
      </div>
      <Card title="Recent gate activity">
        {recent.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {recent.map((v) => (
                <tr key={v._id} className="border-t">
                  <td className="py-2">{v.name}</td>
                  <td className="text-slate-500">{v.flatNo}</td>
                  <td><Badge value={v.type} /></td>
                  <td><Badge value={v.status} /></td>
                  <td className="text-right text-slate-500">{fmtTime(v.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function AdminHome() {
  const [stats, setStats] = useState({});
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    api.get('/societies/stats').then((r) => setStats(r.data));
    api.get('/bills/summary').then((r) => setSummary(r.data.summary));
  }, []);
  return (
    <>
      <PageTitle title="Admin dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Residents" value={stats.residents ?? '-'} hint={`${stats.guards ?? 0} guards`} />
        <Stat label="Open complaints" value={stats.openComplaints ?? '-'} />
        <Stat label="Unpaid bills" value={stats.unpaidBills ?? '-'} hint={money(stats.unpaidAmount)} />
        <Stat label="Visitors inside now" value={stats.insideVisitors ?? '-'} />
      </div>
      {summary && (
        <Card title="Collections">
          <div className="grid grid-cols-3 gap-4 text-center">
            {['paid', 'unpaid', 'overdue'].map((k) => (
              <div key={k}>
                <Badge value={k} />
                <p className="text-xl font-bold mt-2">{money(summary[k].total)}</p>
                <p className="text-xs text-slate-500">{summary[k].count} bills</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className="grid gap-2 sm:grid-cols-4 mt-6">
        <Link href="/bills" className="btn-primary">Generate bills</Link>
        <Link href="/complaints" className="btn-secondary">Manage complaints</Link>
        <Link href="/community" className="btn-secondary">Post notice</Link>
        <Link href="/admin/users" className="btn-secondary">Members</Link>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <AppShell>
      {user?.role === 'guard' ? <GuardHome /> : user?.role === 'admin' ? <AdminHome /> : user ? <ResidentHome /> : null}
    </AppShell>
  );
}
