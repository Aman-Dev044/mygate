'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { Card, Badge, Empty, PageTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api, { fmtDateTime } from '@/lib/api';

const LINK = { visitor: '/visitors', daily_help: '/daily-help', bill: '/bills', complaint: '/complaints', amenity: '/amenities', notice: '/community', child: '/kids' };

export default function NotificationsPage() {
  const { setUnread, subscribe } = useAuth();
  const [list, setList] = useState([]);
  const load = useCallback(() => api.get('/notifications').then((r) => { setList(r.data.notifications); setUnread(r.data.unreadCount); }), [setUnread]);
  useEffect(() => {
    load();
    return subscribe(() => load());
  }, [load, subscribe]);

  const readAll = async () => {
    await api.patch('/notifications/read-all');
    load();
  };
  const read = async (n) => {
    if (!n.read) await api.patch(`/notifications/${n._id}/read`);
    load();
  };

  return (
    <AppShell>
      <PageTitle title="Notifications" action={<button className="btn-secondary" onClick={readAll}>Mark all read</button>} />
      <Card>
        {list.length === 0 ? <Empty text="No notifications." /> : (
          <div className="divide-y">
            {list.map((n) => (
              <Link key={n._id} href={LINK[n.type] || '/dashboard'} onClick={() => read(n)} className={`block py-3 px-2 rounded hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50'}`}>
                <div className="flex justify-between gap-2">
                  <p className={`text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title} <Badge value={n.type.replace('_', ' ')} /></p>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(n.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600">{n.message}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
