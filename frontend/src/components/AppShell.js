'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ['resident', 'guard', 'admin'] },
  { href: '/visitors', label: 'Visitors', icon: '🚪', roles: ['resident', 'guard', 'admin'] },
  { href: '/daily-help', label: 'Daily Help', icon: '🧹', roles: ['resident', 'guard', 'admin'] },
  { href: '/bills', label: 'Bills', icon: '💳', roles: ['resident', 'admin'] },
  { href: '/complaints', label: 'Complaints', icon: '🛠️', roles: ['resident', 'admin'] },
  { href: '/amenities', label: 'Amenities', icon: '🏊', roles: ['resident', 'admin'] },
  { href: '/community', label: 'Community', icon: '📢', roles: ['resident', 'admin', 'guard'] },
  { href: '/kids', label: 'Kid Safety', icon: '🧒', roles: ['resident', 'guard', 'admin'] },
  { href: '/admin/users', label: 'Members', icon: '👥', roles: ['admin'] },
];

export default function AppShell({ children }) {
  const { user, loading, logout, unread } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <div className="p-10 text-center text-slate-500">Loading...</div>;

  const items = NAV.filter((n) => n.roles.includes(user.role));

  const sidebar = (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-6 px-2">
        <div className="text-xl font-bold text-brand-700">MyGate</div>
        <div className="text-xs text-slate-500 mt-1">
          {user.name} · <span className="capitalize">{user.role}</span>
          {user.flatNo ? ` · ${user.flatNo}` : ''}
        </div>
      </div>
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
            pathname.startsWith(n.href) ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>{n.icon}</span>
          {n.label}
        </Link>
      ))}
      <button onClick={logout} className="mt-6 text-left rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
        Logout
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:block w-60 shrink-0 border-r border-slate-200 bg-white">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)}>
          <aside className="w-60 h-full bg-white" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <button className="md:hidden text-xl" onClick={() => setOpen(true)}>
            ☰
          </button>
          <div className="text-sm text-slate-500 hidden md:block">Society management</div>
          <Link href="/notifications" className="relative text-xl">
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-2 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread}</span>
            )}
          </Link>
        </header>
        <main className="p-4 md:p-8 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
