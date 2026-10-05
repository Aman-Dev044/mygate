'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, Field, Modal, PageTitle, Tabs } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { money, todayStr } from '@/lib/api';

export default function AmenitiesPage() {
  const { user, toast } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('book');
  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', openTime: '06:00', closeTime: '22:00', slotMinutes: 60, capacity: 1, chargePerSlot: 0 });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api.get('/amenities'), api.get('/amenities/bookings/mine')]);
    setAmenities(a.data.amenities);
    setBookings(b.data.bookings);
  }, []);
  useEffect(() => { if (user) load(); }, [load, user]);

  useEffect(() => {
    if (selected) api.get(`/amenities/${selected._id}/slots?date=${date}`).then((r) => setSlots(r.data.slots));
  }, [selected, date]);

  const book = async (slot) => {
    try {
      await api.post(`/amenities/${selected._id}/book`, { date, startTime: slot.startTime });
      toast(`Booked ${selected.name} at ${slot.startTime}`, 'success');
      const r = await api.get(`/amenities/${selected._id}/slots?date=${date}`);
      setSlots(r.data.slots);
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  const cancel = async (id) => {
    await api.delete(`/amenities/bookings/${id}`);
    load();
  };

  const addAmenity = async (e) => {
    e.preventDefault();
    try {
      await api.post('/amenities', form);
      toast('Amenity added', 'success');
      setCreate(false);
      load();
    } catch (err) {
      toast(err.userMessage, 'error');
    }
  };

  return (
    <AppShell>
      <PageTitle
        title="Amenities"
        subtitle="Clubhouse, gym, pool and community hall slots"
        action={isAdmin && <button className="btn-primary" onClick={() => setCreate(true)}>+ Add amenity</button>}
      />
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'book', label: 'Book a slot' }, { key: 'mine', label: isAdmin ? `All bookings (${bookings.length})` : `My bookings (${bookings.length})` }]} />

      {tab === 'book' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3">
            {amenities.map((a) => (
              <button key={a._id} onClick={() => setSelected(a)} className={`card w-full text-left ${selected?._id === a._id ? 'ring-2 ring-brand-500' : ''}`}>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-slate-500">{a.description}</p>
                <p className="text-xs text-slate-500 mt-1">{a.openTime} - {a.closeTime} · {a.slotMinutes} min slots · {a.chargePerSlot ? money(a.chargePerSlot) + '/slot' : 'Free'}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2">
            <Card
              title={selected ? `${selected.name} slots` : 'Select an amenity'}
              action={<input type="date" className="input w-44" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />}
            >
              {!selected ? (
                <Empty text="Pick an amenity on the left." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {slots.map((s) => {
                    const past = new Date(`${date}T${s.startTime}`) < new Date();
                    const full = s.available <= 0;
                    return (
                      <button
                        key={s.startTime}
                        disabled={past || full || s.bookedByMe || isAdmin}
                        onClick={() => book(s)}
                        className={`rounded-lg border p-2 text-sm text-center ${
                          s.bookedByMe ? 'bg-brand-600 text-white border-brand-600' : full || past ? 'bg-slate-100 text-slate-400' : 'bg-white hover:border-brand-500'
                        }`}
                      >
                        <div className="font-medium">{s.startTime} - {s.endTime}</div>
                        <div className="text-[11px]">{s.bookedByMe ? 'Booked by you' : full ? 'Full' : past ? 'Past' : `${s.available} left`}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'mine' && (
        <Card>
          {bookings.length === 0 ? (
            <Empty text="No bookings yet." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th>Amenity</th>{isAdmin && <th>Flat</th>}<th>Date</th><th>Time</th><th>Amount</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id} className="border-t">
                    <td className="py-2 font-medium">{b.amenity?.name}</td>
                    {isAdmin && <td>{b.flatNo} · {b.bookedBy?.name}</td>}
                    <td>{b.date}</td>
                    <td>{b.startTime} - {b.endTime}</td>
                    <td>{b.amount ? money(b.amount) : 'Free'}</td>
                    <td><Badge value={b.status} /></td>
                    <td className="text-right">{b.status === 'confirmed' && <button className="text-xs text-red-600" onClick={() => cancel(b._id)}>Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={create} title="Add amenity" onClose={() => setCreate(false)}>
        <form onSubmit={addAmenity} className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
          <Field label="Description"><input className="input" value={form.description} onChange={set('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opens"><input className="input" type="time" value={form.openTime} onChange={set('openTime')} /></Field>
            <Field label="Closes"><input className="input" type="time" value={form.closeTime} onChange={set('closeTime')} /></Field>
            <Field label="Slot minutes"><input className="input" type="number" value={form.slotMinutes} onChange={set('slotMinutes')} /></Field>
            <Field label="Capacity per slot"><input className="input" type="number" value={form.capacity} onChange={set('capacity')} /></Field>
            <Field label="Charge per slot (Rs)"><input className="input" type="number" value={form.chargePerSlot} onChange={set('chargePerSlot')} /></Field>
          </div>
          <button className="btn-primary w-full">Save</button>
        </form>
      </Modal>
    </AppShell>
  );
}
