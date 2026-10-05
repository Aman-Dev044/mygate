'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, Field, Modal, PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { fmtDateTime } from '@/lib/api';

const CATS = ['plumbing', 'electrical', 'lift', 'water', 'housekeeping', 'security', 'parking', 'other'];

export default function ComplaintsPage() {
  const { user, toast, subscribe } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [create, setCreate] = useState(false);
  const [active, setActive] = useState(null);
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({ category: 'plumbing', title: '', description: '', priority: 'medium' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = useCallback(() => api.get(`/complaints${filter ? `?status=${filter}` : ''}`).then((r) => setList(r.data.complaints)), [filter]);
  useEffect(() => {
    if (user) load();
    return subscribe(() => load());
  }, [load, subscribe, user]);

  const openDetail = async (id) => {
    const { data } = await api.get(`/complaints/${id}`);
    setActive(data.complaint);
  };

  const raise = async (e) => {
    e.preventDefault();
    try {
      await api.post('/complaints', form);
      toast('Complaint raised', 'success');
      setCreate(false);
      setForm({ category: 'plumbing', title: '', description: '', priority: 'medium' });
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const updateStatus = async (status, assignedTo) => {
    const { data } = await api.patch(`/complaints/${active._id}/status`, { status, assignedTo });
    setActive({ ...active, ...data.complaint, raisedBy: active.raisedBy, comments: active.comments });
    load();
  };

  const addComment = async (e) => {
    e.preventDefault();
    const { data } = await api.post(`/complaints/${active._id}/comments`, { text: comment });
    setActive({ ...active, comments: data.complaint.comments });
    setComment('');
  };

  const rate = async (rating) => {
    await api.post(`/complaints/${active._id}/rate`, { rating });
    toast('Thanks for rating', 'success');
    setActive(null);
    load();
  };

  return (
    <AppShell>
      <PageTitle
        title={isAdmin ? 'Helpdesk' : 'My complaints'}
        subtitle={isAdmin ? 'Track and resolve resident complaints' : 'Plumbing, lift, water and other issues'}
        action={!isAdmin && <button className="btn-primary" onClick={() => setCreate(true)}>+ Raise complaint</button>}
      />
      <Card
        title="Tickets"
        action={
          <select className="input w-40" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            {['open', 'in_progress', 'resolved', 'closed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        }
      >
        {list.length === 0 ? (
          <Empty text="No complaints." />
        ) : (
          <div className="divide-y">
            {list.map((c) => (
              <button key={c._id} onClick={() => openDetail(c._id)} className="w-full text-left py-3 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-50 px-2 rounded">
                <div>
                  <p className="font-medium">{c.title} <Badge value={c.priority} /></p>
                  <p className="text-xs text-slate-500 capitalize">
                    {c.category} · {isAdmin ? `${c.raisedBy?.flatNo} · ${c.raisedBy?.name} · ` : ''}{fmtDateTime(c.createdAt)}
                  </p>
                </div>
                <Badge value={c.status} />
              </button>
            ))}
          </div>
        )}
      </Card>

      <Modal open={create} title="Raise complaint" onClose={() => setCreate(false)}>
        <form onSubmit={raise} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className="input" value={form.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Priority">
              <select className="input" value={form.priority} onChange={set('priority')}>{['low', 'medium', 'high'].map((p) => <option key={p}>{p}</option>)}</select>
            </Field>
          </div>
          <Field label="Title"><input className="input" value={form.title} onChange={set('title')} required /></Field>
          <Field label="Description"><textarea className="input" rows={4} value={form.description} onChange={set('description')} required /></Field>
          <button className="btn-primary w-full">Submit</button>
        </form>
      </Modal>

      <Modal open={!!active} title={active?.title} onClose={() => setActive(null)}>
        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge value={active.status} /><Badge value={active.priority} /><span className="text-xs capitalize text-slate-500">{active.category}</span>
              {active.assignedTo && <span className="text-xs text-slate-500">· assigned to {active.assignedTo}</span>}
            </div>
            <p className="text-sm">{active.description}</p>
            <p className="text-xs text-slate-500">Raised by {active.raisedBy?.name} ({active.raisedBy?.flatNo}) on {fmtDateTime(active.createdAt)}</p>

            {isAdmin && active.status !== 'closed' && (
              <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-medium">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {['open', 'in_progress', 'resolved'].map((s) => (
                    <button key={s} className={`btn text-xs ${active.status === s ? 'bg-brand-600 text-white' : 'bg-white border'}`} onClick={() => updateStatus(s)}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  placeholder="Assign to (vendor / staff) and press Enter"
                  defaultValue={active.assignedTo || ''}
                  onKeyDown={(e) => e.key === 'Enter' && updateStatus(undefined, e.target.value)}
                />
              </div>
            )}

            {!isAdmin && active.status === 'resolved' && (
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs font-medium mb-2">Issue resolved? Rate the service to close it.</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => <button key={n} className="text-2xl" onClick={() => rate(n)}>{'★'}</button>)}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium mb-2">Comments</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {active.comments.length === 0 && <p className="text-xs text-slate-400">No comments yet.</p>}
                {active.comments.map((c, i) => (
                  <div key={i} className={`rounded-lg p-2 text-sm ${c.by?.role === 'admin' ? 'bg-brand-50' : 'bg-slate-100'}`}>
                    <p className="text-xs text-slate-500">{c.by?.name} · {fmtDateTime(c.at)}</p>
                    {c.text}
                  </div>
                ))}
              </div>
              {active.status !== 'closed' && (
                <form onSubmit={addComment} className="flex gap-2 mt-2">
                  <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment" required />
                  <button className="btn-primary">Send</button>
                </form>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
