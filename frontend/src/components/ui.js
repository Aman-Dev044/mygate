'use client';

export function Card({ title, action, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const badgeColors = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  denied: 'bg-red-100 text-red-800',
  entered: 'bg-blue-100 text-blue-800',
  exited: 'bg-slate-100 text-slate-700',
  expired: 'bg-slate-100 text-slate-500',
  paid: 'bg-emerald-100 text-emerald-800',
  unpaid: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-700',
  confirmed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500',
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-700',
  inside: 'bg-emerald-100 text-emerald-800',
  outside: 'bg-slate-100 text-slate-600',
  emergency: 'bg-red-100 text-red-800',
  event: 'bg-purple-100 text-purple-800',
  meeting: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-amber-100 text-amber-800',
  general: 'bg-slate-100 text-slate-700',
};

export function Badge({ value, children }) {
  const v = value ?? children;
  const label = children ?? String(v).replace('_', ' ');
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badgeColors[v] || 'bg-slate-100 text-slate-700'}`}>
      {label}
    </span>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Empty({ text = 'Nothing here yet.' }) {
  return <p className="text-sm text-slate-500 py-6 text-center">{text}</p>;
}

export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
            active === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
