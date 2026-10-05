'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, Field, Modal, PageTitle, Tabs } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { fmtDateTime } from '@/lib/api';

function Notices({ isAdmin }) {
  const { toast } = useAuth();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'general', pinned: false });
  const load = useCallback(() => api.get('/community/notices').then((r) => setList(r.data.notices)), []);
  useEffect(() => { load(); }, [load]);

  const post = async (e) => {
    e.preventDefault();
    try {
      await api.post('/community/notices', form);
      toast('Notice posted to all residents', 'success');
      setOpen(false);
      setForm({ title: '', body: '', category: 'general', pinned: false });
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };
  const del = async (id) => {
    await api.delete(`/community/notices/${id}`);
    load();
  };

  return (
    <>
      {isAdmin && <div className="mb-4 text-right"><button className="btn-primary" onClick={() => setOpen(true)}>+ Post notice</button></div>}
      {list.length === 0 ? <Empty text="No notices." /> : (
        <div className="space-y-3">
          {list.map((n) => (
            <Card key={n._id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{n.pinned && '📌 '}{n.title} <Badge value={n.category} /></p>
                  <p className="text-sm mt-1 whitespace-pre-line">{n.body}</p>
                  <p className="text-xs text-slate-500 mt-2">{n.postedBy?.name} · {fmtDateTime(n.createdAt)}</p>
                </div>
                {isAdmin && <button className="text-xs text-red-600" onClick={() => del(n._id)}>Delete</button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} title="Post notice" onClose={() => setOpen(false)}>
        <form onSubmit={post} className="space-y-3">
          <Field label="Title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Message"><textarea className="input" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Category">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['general', 'maintenance', 'event', 'emergency', 'meeting'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Pin to top</label>
          </div>
          <button className="btn-primary w-full">Post and notify residents</button>
        </form>
      </Modal>
    </>
  );
}

function Polls({ isAdmin, isResident }) {
  const { toast } = useAuth();
  const [polls, setPolls] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ question: '', options: ['', ''], closesAt: '' });
  const load = useCallback(() => api.get('/community/polls').then((r) => setPolls(r.data.polls)), []);
  useEffect(() => { load(); }, [load]);

  const vote = async (id, idx) => {
    try {
      await api.post(`/community/polls/${id}/vote`, { optionIndex: idx });
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };
  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/community/polls', { ...form, options: form.options.filter(Boolean), closesAt: form.closesAt || undefined });
      setOpen(false);
      setForm({ question: '', options: ['', ''], closesAt: '' });
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };
  const close = async (id) => {
    await api.patch(`/community/polls/${id}/close`);
    load();
  };

  return (
    <>
      {isAdmin && <div className="mb-4 text-right"><button className="btn-primary" onClick={() => setOpen(true)}>+ Create poll</button></div>}
      {polls.length === 0 ? <Empty text="No polls." /> : (
        <div className="space-y-3">
          {polls.map((p) => (
            <Card key={p._id}>
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{p.question}</p>
                {p.active ? <Badge value="open" /> : <Badge value="closed" />}
              </div>
              <div className="mt-3 space-y-2">
                {p.options.map((o, i) => {
                  const pct = p.total ? Math.round((o.votes / p.total) * 100) : 0;
                  return (
                    <button key={o._id} disabled={!p.active || !isResident} onClick={() => vote(p._id, i)} className="w-full text-left">
                      <div className="flex justify-between text-sm">
                        <span>{p.myVote === i && '✓ '}{o.text}</span>
                        <span className="text-slate-500">{o.votes} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded bg-slate-100 mt-1"><div className={`h-2 rounded ${p.myVote === i ? 'bg-brand-600' : 'bg-slate-400'}`} style={{ width: `${pct}%` }} /></div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3 text-xs text-slate-500">
                <span>{p.total} votes{p.closesAt ? ` · closes ${fmtDateTime(p.closesAt)}` : ''}</span>
                {isAdmin && p.active && <button className="text-red-600" onClick={() => close(p._id)}>Close poll</button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} title="Create poll" onClose={() => setOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <Field label="Question"><input className="input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required /></Field>
          {form.options.map((o, i) => (
            <Field key={i} label={`Option ${i + 1}`}>
              <input className="input" value={o} onChange={(e) => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }); }} required={i < 2} />
            </Field>
          ))}
          <button type="button" className="btn-secondary text-xs" onClick={() => setForm({ ...form, options: [...form.options, ''] })}>+ Add option</button>
          <Field label="Closes at (optional)"><input className="input" type="datetime-local" value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} /></Field>
          <button className="btn-primary w-full">Create</button>
        </form>
      </Modal>
    </>
  );
}

function Discussions({ canPost }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [reply, setReply] = useState({});
  const load = useCallback(() => api.get('/community/discussions').then((r) => setList(r.data.discussions)), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/community/discussions', form);
    setOpen(false);
    setForm({ title: '', body: '' });
    load();
  };
  const send = async (id) => {
    if (!reply[id]) return;
    await api.post(`/community/discussions/${id}/replies`, { text: reply[id] });
    setReply({ ...reply, [id]: '' });
    load();
  };

  return (
    <>
      {canPost && <div className="mb-4 text-right"><button className="btn-primary" onClick={() => setOpen(true)}>+ New discussion</button></div>}
      {list.length === 0 ? <Empty text="No discussions yet." /> : (
        <div className="space-y-3">
          {list.map((d) => (
            <Card key={d._id}>
              <p className="font-semibold">{d.title}</p>
              <p className="text-sm mt-1">{d.body}</p>
              <p className="text-xs text-slate-500 mt-1">{d.createdBy?.name} ({d.createdBy?.flatNo}) · {fmtDateTime(d.createdAt)}</p>
              <div className="mt-3 space-y-2 border-l-2 pl-3">
                {d.replies.map((r, i) => (
                  <div key={i} className="text-sm"><span className="font-medium">{r.by?.name} ({r.by?.flatNo}):</span> {r.text}</div>
                ))}
              </div>
              {canPost && (
                <div className="flex gap-2 mt-3">
                  <input className="input" placeholder="Reply..." value={reply[d._id] || ''} onChange={(e) => setReply({ ...reply, [d._id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && send(d._id)} />
                  <button className="btn-secondary" onClick={() => send(d._id)}>Reply</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} title="New discussion" onClose={() => setOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <Field label="Title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Message"><textarea className="input" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></Field>
          <button className="btn-primary w-full">Post</button>
        </form>
      </Modal>
    </>
  );
}

function Directory() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  useEffect(() => { api.get('/societies/residents').then((r) => setList(r.data.residents)); }, []);
  const filtered = list.filter((r) => `${r.name} ${r.flatNo}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card title="Resident directory" action={<input className="input w-48" placeholder="Search name / flat" value={q} onChange={(e) => setQ(e.target.value)} />}>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500"><tr><th>Flat</th><th>Name</th><th>Phone</th><th></th></tr></thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r._id} className="border-t">
              <td className="py-2 font-medium">{r.flatNo}</td>
              <td>{r.name}</td>
              <td className="text-slate-500">{r.phone}</td>
              <td className="text-xs text-slate-500">{r.isOwner ? 'Owner' : 'Tenant'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function CommunityPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('notices');
  const isAdmin = user?.role === 'admin';
  const isResident = user?.role === 'resident';
  return (
    <AppShell>
      <PageTitle title="Community" subtitle="Notices, polls, discussions and resident directory" />
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'notices', label: 'Notices' }, { key: 'polls', label: 'Polls' }, { key: 'discussions', label: 'Discussions' }, { key: 'directory', label: 'Directory' }]} />
      {tab === 'notices' && <Notices isAdmin={isAdmin} />}
      {tab === 'polls' && <Polls isAdmin={isAdmin} isResident={isResident} />}
      {tab === 'discussions' && <Discussions canPost={isAdmin || isResident} />}
      {tab === 'directory' && <Directory />}
    </AppShell>
  );
}
