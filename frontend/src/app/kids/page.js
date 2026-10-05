'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, Field, Modal, PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { fmtDateTime } from '@/lib/api';

function LogsModal({ child, onClose }) {
  const [logs, setLogs] = useState([]);
  useEffect(() => { if (child) api.get(`/children/${child._id}/logs`).then((r) => setLogs(r.data.logs)); }, [child]);
  return (
    <Modal open={!!child} title={`Movement log - ${child?.name}`} onClose={onClose}>
      {logs.length === 0 ? <Empty text="No movements logged." /> : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l._id} className={`rounded-lg p-3 text-sm ${l.action === 'exit' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              <p className="font-medium">{l.action === 'exit' ? '🚶 Went out' : '🏠 Came back'} with {l.escort}</p>
              <p className="text-xs text-slate-500">{fmtDateTime(l.at)} · logged by {l.loggedBy?.name}{l.note ? ` · ${l.note}` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ParentView() {
  const { toast, subscribe } = useAuth();
  const [kids, setKids] = useState([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ name: '', age: '', allowedEscorts: '' });
  const load = useCallback(() => api.get('/children').then((r) => setKids(r.data.children)), []);
  useEffect(() => {
    load();
    return subscribe(() => load());
  }, [load, subscribe]);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/children', { ...form, allowedEscorts: form.allowedEscorts.split(',').map((s) => s.trim()).filter(Boolean) });
      toast('Child added', 'success');
      setOpen(false);
      setForm({ name: '', age: '', allowedEscorts: '' });
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };
  const remove = async (id) => {
    await api.delete(`/children/${id}`);
    load();
  };

  return (
    <>
      <PageTitle title="Kid safety" subtitle="Get alerted when your child leaves or enters the society" action={<button className="btn-primary" onClick={() => setOpen(true)}>+ Add child</button>} />
      {kids.length === 0 ? <Card><Empty text="No children registered." /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {kids.map((k) => (
            <Card key={k._id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{k.name}, {k.age} yrs</p>
                  <p className="text-xs text-slate-500">Allowed with: {k.allowedEscorts.length ? k.allowedEscorts.join(', ') : 'anyone'}</p>
                </div>
                <Badge value={k.isInside ? 'inside' : 'outside'} />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary text-xs" onClick={() => setView(k)}>Movement log</button>
                <button className="text-xs text-red-600 px-2" onClick={() => remove(k._id)}>Remove</button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <LogsModal child={view} onClose={() => setView(null)} />
      <Modal open={open} title="Add child" onClose={() => setOpen(false)}>
        <form onSubmit={add} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Age"><input className="input" type="number" min="0" max="18" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required /></Field>
          <Field label="Allowed escorts (comma separated)"><input className="input" placeholder="School bus, Grandfather, Nanny" value={form.allowedEscorts} onChange={(e) => setForm({ ...form, allowedEscorts: e.target.value })} /></Field>
          <p className="text-xs text-slate-500">If the guard logs an exit with someone not in this list, you get a warning alert.</p>
          <button className="btn-primary w-full">Save</button>
        </form>
      </Modal>
    </>
  );
}

function GuardView() {
  const { toast } = useAuth();
  const [kids, setKids] = useState([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [escort, setEscort] = useState('');
  const [note, setNote] = useState('');
  const load = useCallback(() => api.get('/children').then((r) => setKids(r.data.children)), []);
  useEffect(() => { load(); }, [load]);

  const log = async (action) => {
    try {
      const { data } = await api.post(`/children/${sel._id}/log`, { action, escort, note });
      toast(data.escortAllowed ? `${sel.name} ${action} logged, parents notified` : `Logged with WARNING: escort not in allowed list`, data.escortAllowed ? 'success' : 'error');
      setSel(null);
      setEscort('');
      setNote('');
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const filtered = kids.filter((k) => `${k.name} ${k.flatNo}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageTitle title="Kid safety - gate" subtitle="Log when a child leaves or returns; parents are alerted instantly" />
      <Card action={<input className="input w-56" placeholder="Search child / flat" value={q} onChange={(e) => setQ(e.target.value)} />} title="Children">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Name</th><th>Flat</th><th>Allowed escorts</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map((k) => (
              <tr key={k._id} className="border-t">
                <td className="py-2 font-medium">{k.name} <span className="text-slate-500">({k.age})</span></td>
                <td>{k.flatNo}<div className="text-xs text-slate-500">{k.parent?.name} · {k.parent?.phone}</div></td>
                <td className="text-xs">{k.allowedEscorts.join(', ') || 'anyone'}</td>
                <td><Badge value={k.isInside ? 'inside' : 'outside'} /></td>
                <td className="text-right"><button className={k.isInside ? 'btn-secondary text-xs' : 'btn-success text-xs'} onClick={() => setSel(k)}>{k.isInside ? 'Log exit' : 'Log entry'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={!!sel} title={`${sel?.isInside ? 'Exit' : 'Entry'} - ${sel?.name}`} onClose={() => setSel(null)}>
        {sel && (
          <div className="space-y-3">
            <Field label="Going with / coming with">
              <input className="input" list="escorts" value={escort} onChange={(e) => setEscort(e.target.value)} placeholder="School bus, parent name..." />
              <datalist id="escorts">{sel.allowedEscorts.map((e) => <option key={e} value={e} />)}</datalist>
            </Field>
            <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <button className={`w-full ${sel.isInside ? 'btn-danger' : 'btn-success'}`} disabled={!escort} onClick={() => log(sel.isInside ? 'exit' : 'entry')}>
              Confirm {sel.isInside ? 'exit' : 'entry'} and notify parents
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function KidsPage() {
  const { user } = useAuth();
  return <AppShell>{user?.role === 'resident' ? <ParentView /> : <GuardView />}</AppShell>;
}
