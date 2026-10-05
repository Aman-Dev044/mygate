'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, Field, Modal, Tabs, PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { fmtDateTime, fmtTime } from '@/lib/api';

const TYPES = ['guest', 'delivery', 'cab', 'service', 'other'];

/* ---------------- Resident view: approvals + pre-approval ---------------- */
function ResidentVisitors() {
  const { toast, subscribe } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', type: 'guest', company: '', vehicleNo: '', validTo: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = useCallback(() => api.get('/visitors').then((r) => setVisitors(r.data.visitors)), []);
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

  const preApprove = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/visitors/preapprove', { ...form, validTo: form.validTo || undefined });
      setResult(data);
      setForm({ name: '', phone: '', type: 'guest', company: '', vehicleNo: '', validTo: '' });
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const cancel = async (id) => {
    await api.delete(`/visitors/${id}`);
    load();
  };

  const pending = visitors.filter((v) => v.status === 'pending');
  const active = visitors.filter((v) => v.status === 'approved' && v.preApproved);
  const history = visitors.filter((v) => !['pending'].includes(v.status) && !(v.status === 'approved' && v.preApproved));

  return (
    <>
      <PageTitle
        title="Visitors"
        subtitle="Approve guests at the gate or pre-approve with a passcode"
        action={<button className="btn-primary" onClick={() => { setResult(null); setOpen(true); }}>+ Pre-approve visitor</button>}
      />

      <Card title="Waiting at gate" className="mb-4">
        {pending.length === 0 ? (
          <Empty text="No one is waiting right now." />
        ) : (
          <div className="space-y-3">
            {pending.map((v) => (
              <div key={v._id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {v.name} {v.company && `(${v.company})`} <Badge value={v.type} />
                  </p>
                  <p className="text-xs text-slate-600">{fmtTime(v.createdAt)} {v.vehicleNo && `· ${v.vehicleNo}`}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-success" onClick={() => respond(v._id, 'approve')}>Allow</button>
                  <button className="btn-danger" onClick={() => respond(v._id, 'deny')}>Deny</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Active pre-approvals" className="mb-4">
        {active.length === 0 ? (
          <Empty text="No active passcodes." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th>Name</th><th>Passcode</th><th>Valid till</th><th></th></tr>
            </thead>
            <tbody>
              {active.map((v) => (
                <tr key={v._id} className="border-t">
                  <td className="py-2">{v.name} <Badge value={v.type} /></td>
                  <td className="font-mono text-lg tracking-widest">{v.passcode}</td>
                  <td className="text-slate-500">{fmtDateTime(v.validTo)}</td>
                  <td className="text-right"><button className="text-red-600 text-xs" onClick={() => cancel(v._id)}>Cancel</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="History">
        {history.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th>Name</th><th>Type</th><th>Status</th><th>In</th><th>Out</th></tr>
            </thead>
            <tbody>
              {history.map((v) => (
                <tr key={v._id} className="border-t">
                  <td className="py-2">{v.name} {v.company && <span className="text-slate-500">({v.company})</span>}</td>
                  <td><Badge value={v.type} /></td>
                  <td><Badge value={v.status} /></td>
                  <td className="text-slate-500">{fmtTime(v.entryTime)}</td>
                  <td className="text-slate-500">{fmtTime(v.exitTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} title="Pre-approve a visitor" onClose={() => setOpen(false)}>
        {result ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">Share this passcode with {result.visitor.name}</p>
            <p className="font-mono text-4xl tracking-[0.4em] font-bold text-brand-700">{result.visitor.passcode}</p>
            <p className="text-xs text-slate-500">Valid till {fmtDateTime(result.visitor.validTo)}</p>
            <textarea className="input" rows={3} readOnly value={result.shareText} />
            <button className="btn-secondary w-full" onClick={() => navigator.clipboard?.writeText(result.shareText)}>Copy message</button>
          </div>
        ) : (
          <form onSubmit={preApprove} className="space-y-3">
            <Field label="Visitor name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
              <Field label="Type">
                <select className="input" value={form.type} onChange={set('type')}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company (Swiggy/Uber)"><input className="input" value={form.company} onChange={set('company')} /></Field>
              <Field label="Vehicle no"><input className="input" value={form.vehicleNo} onChange={set('vehicleNo')} /></Field>
            </div>
            <Field label="Valid till (default 24h)"><input className="input" type="datetime-local" value={form.validTo} onChange={set('validTo')} /></Field>
            <button className="btn-primary w-full">Generate passcode</button>
          </form>
        )}
      </Modal>
    </>
  );
}

/* ---------------- Guard view: gate console ---------------- */
function GuardVisitors() {
  const { toast, subscribe } = useAuth();
  const [tab, setTab] = useState('gate');
  const [visitors, setVisitors] = useState([]);
  const [form, setForm] = useState({ flatNo: '', name: '', phone: '', type: 'delivery', company: '', vehicleNo: '', purpose: '' });
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = useCallback(() => api.get('/visitors?limit=100').then((r) => setVisitors(r.data.visitors)), []);
  useEffect(() => {
    load();
    return subscribe(() => load());
  }, [load, subscribe]);

  const createAtGate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/visitors/gate', form);
      toast(`Request sent to flat ${form.flatNo}`, 'success');
      setForm({ flatNo: '', name: '', phone: '', type: 'delivery', company: '', vehicleNo: '', purpose: '' });
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setVerified(null);
    try {
      const { data } = await api.post('/visitors/verify', { passcode: code });
      setVerified(data.visitor);
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const mark = async (id, what) => {
    try {
      await api.patch(`/visitors/${id}/${what}`);
      toast(`Marked ${what}`, 'success');
      setVerified(null);
      setCode('');
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const waiting = visitors.filter((v) => v.status === 'pending');
  const approved = visitors.filter((v) => v.status === 'approved');
  const inside = visitors.filter((v) => v.status === 'entered');

  return (
    <>
      <PageTitle title="Gate console" subtitle="Log visitors, verify passcodes, mark entry and exit" />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'gate', label: `New visitor` },
          { key: 'code', label: 'Verify passcode' },
          { key: 'waiting', label: `Waiting (${waiting.length})` },
          { key: 'approved', label: `Approved (${approved.length})` },
          { key: 'inside', label: `Inside (${inside.length})` },
        ]}
      />

      {tab === 'gate' && (
        <Card title="Visitor at gate - ask resident">
          <form onSubmit={createAtGate} className="grid gap-3 sm:grid-cols-2">
            <Field label="Flat no"><input className="input" value={form.flatNo} onChange={set('flatNo')} placeholder="A-101" required /></Field>
            <Field label="Visitor name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
            <Field label="Type">
              <select className="input" value={form.type} onChange={set('type')}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Company"><input className="input" value={form.company} onChange={set('company')} placeholder="Swiggy / Amazon / Uber" /></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Vehicle no"><input className="input" value={form.vehicleNo} onChange={set('vehicleNo')} /></Field>
            <div className="sm:col-span-2"><button className="btn-primary w-full">Send approval request to resident</button></div>
          </form>
        </Card>
      )}

      {tab === 'code' && (
        <Card title="Verify pre-approved passcode">
          <form onSubmit={verify} className="flex gap-2">
            <input className="input font-mono text-xl tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6} required />
            <button className="btn-primary">Verify</button>
          </form>
          {verified && (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-800">Valid passcode</p>
              <p className="text-sm">{verified.name} · {verified.type} · Flat {verified.flatNo}</p>
              <p className="text-xs text-slate-500">Valid till {fmtDateTime(verified.validTo)}</p>
              <button className="btn-success mt-3" onClick={() => mark(verified._id, 'entry')}>Allow entry</button>
            </div>
          )}
        </Card>
      )}

      {['waiting', 'approved', 'inside'].includes(tab) && (
        <Card>
          {(tab === 'waiting' ? waiting : tab === 'approved' ? approved : inside).length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th>Name</th><th>Flat</th><th>Type</th><th>Status</th><th>Time</th><th></th></tr>
              </thead>
              <tbody>
                {(tab === 'waiting' ? waiting : tab === 'approved' ? approved : inside).map((v) => (
                  <tr key={v._id} className="border-t">
                    <td className="py-2">{v.name} {v.company && <span className="text-slate-500">({v.company})</span>}</td>
                    <td>{v.flatNo}</td>
                    <td><Badge value={v.type} /></td>
                    <td><Badge value={v.status} />{v.preApproved && <span className="ml-1 text-xs text-slate-500">code {v.passcode}</span>}</td>
                    <td className="text-slate-500">{fmtTime(v.entryTime || v.updatedAt)}</td>
                    <td className="text-right">
                      {v.status === 'approved' && <button className="btn-success text-xs" onClick={() => mark(v._id, 'entry')}>Entry</button>}
                      {v.status === 'entered' && <button className="btn-secondary text-xs" onClick={() => mark(v._id, 'exit')}>Exit</button>}
                      {v.status === 'pending' && <span className="text-xs text-amber-600">waiting...</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}

export default function VisitorsPage() {
  const { user } = useAuth();
  return <AppShell>{user?.role === 'resident' ? <ResidentVisitors /> : <GuardVisitors />}</AppShell>;
}
