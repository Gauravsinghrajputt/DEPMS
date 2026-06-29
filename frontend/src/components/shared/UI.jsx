import clsx from 'clsx';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ── StatCard ──────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={clsx('p-2.5 rounded-xl', colors[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={clsx('flex items-center gap-1 text-xs mt-2',
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400')}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {trend > 0 ? `+${trend}` : trend} vs yesterday
        </div>
      )}
    </div>
  );
}

// ── ProgressRing ──────────────────────────────────────
export function ProgressRing({ pct = 0, size = 80, stroke = 8, color }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ - (pct / 100) * circ;
  const clr = color || (pct >= 100 ? '#16a34a' : pct >= 60 ? '#2563eb' : pct >= 30 ? '#d97706' : '#dc2626');

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={clr} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color: clr }}>{pct}%</span>
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────
export function ProgressBar({ pct = 0, className }) {
  const color = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className={clsx('progress-bar', className)}>
      <div className={clsx('progress-fill', color)} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────
export function PctBadge({ pct }) {
  const cls = pct >= 100 ? 'badge-green' : pct >= 60 ? 'badge-blue' : pct >= 30 ? 'badge-yellow' : 'badge-red';
  return <span className={cls}>{pct}%</span>;
}

// ── Modal ─────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full animate-slide-up', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className="flex justify-center p-8">
      <svg className={clsx('animate-spin text-primary-600', s)} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────
export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {sub && <p className="text-sm text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────
export function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />}
      <p className="text-gray-500 font-medium">{title}</p>
      {sub && <p className="text-gray-400 text-sm mt-1">{sub}</p>}
    </div>
  );
}

// ── Data table wrapper ─────────────────────────────────
export function DataTable({ columns, rows, keyField = 'id' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>{columns.map((c) => <th key={c.key} className="table-th">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={row[keyField]} className="hover:bg-gray-50/50 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className="table-td">
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
