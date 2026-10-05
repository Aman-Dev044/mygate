'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, Field, Modal, PageTitle, Stat } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { fmtDate, fmtDateTime, money } from '@/lib/api';

const TYPES = ['maintenance', 'water', 'electricity', 'parking', 'penalty', 'other'];

export default function BillsPage() {
  const { user, toast, subscribe } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState({ bills: [], totalDue: 0 });
  const [paying, setPaying] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [method, setMethod] = useState('upi');
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState({ flatNo: 'ALL', type: 'maintenance', description: '', amount: '', period: '', dueDate: '' });
  const [filter, setFilter] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = useCallback(() => api.get(`/bills${filter ? `?status=${filter}` : ''}`).then((r) => setData(r.data)), [filter]);
  useEffect(() => {
    if (user) load();
    return subscribe(() => load());
  }, [load, subscribe, user]);

  const pay = async () => {
    try {
      const { data: d } = await api.post(`/bills/${paying._id}/pay`, { method });
      setReceipt(d.receipt);
      setPaying(null);
      toast('Payment successful', 'success');
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const markPaid = async (id) => {
    await api.post(`/bills/${id}/mark-paid`, { method: 'cash' });
    load();
  };

  const generate = async (e) => {
    e.preventDefault();
    try {
      const { data: d } = await api.post('/bills', form);
      toast(`${d.count} bill(s) generated`, 'success');
      setCreate(false);
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const unpaid = data.bills.filter((b) => b.status !== 'paid');

  return (
    <AppShell>
      <PageTitle
        title={isAdmin ? 'Billing' : 'My bills'}
        subtitle={isAdmin ? 'Generate and track society bills' : 'Maintenance and other society charges'}
        action={isAdmin && <button className="btn-primary" onClick={() => setCreate(true)}>+ Generate bills</button>}
      />
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat label="Total due" value={money(data.totalDue)} hint={`${unpaid.length} pending`} />
        <Stat label="Overdue" value={data.bills.filter((b) => b.status === 'overdue').length} />
        <Stat label="Paid" value={data.bills.filter((b) => b.status === 'paid').length} />
      </div>
      <Card
        action={
          <select className="input w-40" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        }
        title="Bills"
      >
        {data.bills.length === 0 ? (
          <Empty text="No bills." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th>Invoice</th>{isAdmin && <th>Flat</th>}<th>Type</th><th>Period</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {data.bills.map((b) => (
                  <tr key={b._id} className="border-t">
                    <td className="py-2 font-mono text-xs">{b.invoiceNo}</td>
                    {isAdmin && <td>{b.flatNo}</td>}
                    <td className="capitalize">{b.type}<div className="text-xs text-slate-500">{b.description}</div></td>
                    <td>{b.period}</td>
                    <td className="font-medium">{money(b.amount)}</td>
                    <td>{fmtDate(b.dueDate)}</td>
                    <td><Badge value={b.status} />{b.status === 'paid' && <div className="text-[10px] text-slate-500">{b.paymentMethod} · {fmtDate(b.paidAt)}</div>}</td>
                    <td className="text-right">
                      {b.status !== 'paid' && !isAdmin && <button className="btn-primary text-xs" onClick={() => setPaying(b)}>Pay</button>}
                      {b.status !== 'paid' && isAdmin && <button className="btn-secondary text-xs" onClick={() => markPaid(b._id)}>Mark paid</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pay modal (simulated gateway) */}
      <Modal open={!!paying} title="Pay bill" onClose={() => setPaying(null)}>
        {paying && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{paying.invoiceNo} · {paying.period}</p>
              <p className="text-2xl font-bold">{money(paying.amount)}</p>
            </div>
            <Field label="Payment method">
              <div className="grid grid-cols-3 gap-2">
                {['upi', 'card', 'netbanking'].map((m) => (
                  <button key={m} type="button" onClick={() => setMethod(m)} className={`btn ${method === m ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300'}`}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>
            <button className="btn-success w-full" onClick={pay}>Pay {money(paying.amount)}</button>
            <p className="text-xs text-slate-400 text-center">Demo gateway: payment is simulated instantly.</p>
          </div>
        )}
      </Modal>

      {/* Receipt */}
      <Modal open={!!receipt} title="Payment receipt" onClose={() => setReceipt(null)}>
        {receipt && (
          <div className="space-y-2 text-sm">
            <p className="text-emerald-700 font-semibold text-center text-lg">Payment successful</p>
            <div className="rounded-lg border p-4 space-y-1">
              <p><span className="text-slate-500">Invoice:</span> {receipt.invoiceNo}</p>
              <p><span className="text-slate-500">Amount:</span> {money(receipt.amount)}</p>
              <p><span className="text-slate-500">Method:</span> {receipt.method.toUpperCase()}</p>
              <p><span className="text-slate-500">Reference:</span> <span className="font-mono">{receipt.ref}</span></p>
              <p><span className="text-slate-500">Paid at:</span> {fmtDateTime(receipt.paidAt)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin generate */}
      <Modal open={create} title="Generate bills" onClose={() => setCreate(false)}>
        <form onSubmit={generate} className="space-y-3">
          <Field label="Flat no (ALL = every flat)"><input className="input" value={form.flatNo} onChange={set('flatNo')} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select className="input" value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Amount (Rs)"><input className="input" type="number" min="0" value={form.amount} onChange={set('amount')} required /></Field>
          </div>
          <Field label="Description"><input className="input" value={form.description} onChange={set('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period"><input className="input" value={form.period} onChange={set('period')} placeholder="Nov 2026" /></Field>
            <Field label="Due date"><input className="input" type="date" value={form.dueDate} onChange={set('dueDate')} required /></Field>
          </div>
          <button className="btn-primary w-full">Generate</button>
        </form>
      </Modal>
    </AppShell>
  );
}
