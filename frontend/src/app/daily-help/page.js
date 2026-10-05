'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, Field, Modal, PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { fmtDate, fmtTime } from '@/lib/api';

const TYPES = ['maid', 'cook', 'driver', 'car_cleaner', 'nanny', 'tutor', 'other'];

function AttendanceModal({ help, onClose }) {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => {
    if (help) api.get(`/daily-help/${help._id}/attendance?month=${month}`).then((r) => setData(r.data));
  }, [help, month]);
  return (
    <Modal open={!!help} title={`Attendance - ${help?.name}`} onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <input type="month" className="input w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
        <p className="text-sm">Days present: <b>{data?.daysPresent ?? '-'}</b></p>
      </div>
      {!data || data.attendance.length === 0 ? (
        <Empty text="No attendance this month." />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Date</th><th>In</th><th>Out</th></tr></thead>
          <tbody>
            {data.attendance.map((a) => (
              <tr key={a._id} className="border-t">
                <td className="py-1.5">{fmtDate(a.inTime)}</td>
                <td>{fmtTime(a.inTime)}</td>
                <td>{a.outTime ? fmtTime(a.outTime) : <span className="text-emerald-600">inside</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

function ResidentHelp() {
  const { toast, subscribe } = useAuth();
  const [helps, setHelps] = useState([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', type: 'maid' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = useCallback(() => api.get('/daily-help').then((r) => setHelps(r.data.helps)), []);
  useEffect(() => {
    load();
    return subscribe(() => load());
  }, [load, subscribe]);

  const add = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/daily-help', form);
      toast(data.message || `Passcode for ${data.help.name}: ${data.help.passcode}`, 'success');
      setOpen(false);
      setForm({ name: '', phone: '', type: 'maid' });
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const remove = async (id) => {
    await api.delete(`/daily-help/${id}`);
    load();
  };

  return (
    <>
      <PageTitle title="Daily help" subtitle="Maids, cooks, drivers - each gets a passcode for the gate" action={<button className="btn-primary" onClick={() => setOpen(true)}>+ Add worker</button>} />
      <Card>
        {helps.length === 0 ? (
          <Empty text="No daily help added yet." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {helps.map((h) => (
              <div key={h._id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{h.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{h.type.replace('_', ' ')} · {h.phone}</p>
                  </div>
                  <Badge value={h.isInside ? 'inside' : 'outside'} />
                </div>
                <p className="mt-3 text-xs text-slate-500">Gate passcode</p>
                <p className="font-mono text-2xl tracking-widest">{h.passcode}</p>
                <div className="mt-3 flex gap-2">
                  <button className="btn-secondary text-xs" onClick={() => setView(h)}>Attendance</button>
                  <button className="text-xs text-red-600 px-2" onClick={() => remove(h._id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <AttendanceModal help={view} onClose={() => setView(null)} />
      <Modal open={open} title="Add daily help" onClose={() => setOpen(false)}>
        <form onSubmit={add} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} required /></Field>
          <Field label="Type">
            <select className="input" value={form.type} onChange={set('type')}>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <p className="text-xs text-slate-500">If this phone number already works in another flat, the existing passcode is reused.</p>
          <button className="btn-primary w-full">Add and generate passcode</button>
        </form>
      </Modal>
    </>
  );
}

function GuardHelp() {
  const { toast } = useAuth();
  const [helps, setHelps] = useState([]);
  const [code, setCode] = useState('');
  const [view, setView] = useState(null);
  const load = useCallback(() => api.get('/daily-help').then((r) => setHelps(r.data.helps)), []);
  useEffect(() => { load(); }, [load]);

  const mark = async (action) => {
    try {
      const { data } = await api.post(`/daily-help/${action}`, { passcode: code });
      toast(`${data.help.name} ${action === 'checkin' ? 'checked in' : 'checked out'}`, 'success');
      setCode('');
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  return (
    <>
      <PageTitle title="Daily help - gate" subtitle="Enter passcode to mark entry or exit" />
      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <input className="input font-mono text-xl tracking-widest flex-1 min-w-[180px]" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit passcode" maxLength={6} />
          <button className="btn-success" onClick={() => mark('checkin')} disabled={code.length !== 6}>Check in</button>
          <button className="btn-secondary" onClick={() => mark('checkout')} disabled={code.length !== 6}>Check out</button>
        </div>
      </Card>
      <Card title={`Registered workers (${helps.length})`}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Name</th><th>Type</th><th>Flats</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {helps.map((h) => (
              <tr key={h._id} className="border-t">
                <td className="py-2">{h.name}<div className="text-xs text-slate-500">{h.phone}</div></td>
                <td className="capitalize">{h.type.replace('_', ' ')}</td>
                <td>{h.flats.join(', ')}</td>
                <td><Badge value={h.isInside ? 'inside' : 'outside'} /></td>
                <td className="text-right"><button className="text-xs text-brand-600" onClick={() => setView(h)}>Attendance</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <AttendanceModal help={view} onClose={() => setView(null)} />
    </>
  );
}

export default function DailyHelpPage() {
  const { user } = useAuth();
  return <AppShell>{user?.role === 'resident' ? <ResidentHelp /> : <GuardHelp />}</AppShell>;
}
