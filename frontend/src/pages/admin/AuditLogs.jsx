import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api';
import { PageHeader, Spinner, EmptyState } from '@/components/shared/UI';
import { Shield, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ACTION_COLORS = {
  CREATE: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
  LOGIN: 'badge-yellow',
  EXPORT: 'badge-blue',
  RESET_PASSWORD: 'badge-yellow',
  ASSIGN_TEAM: 'badge-blue',
};

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, from, to],
    queryFn: () => auditApi.list({ page, limit: 50, action, from, to }).then((r) => r.data),
    keepPreviousData: true,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || {};

  const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'RESET_PASSWORD', 'ASSIGN_TEAM'];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        sub="Immutable record of all system actions"
      />

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div>
          <label className="label">Action</label>
          <select className="input w-44" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-end">
          <button className="btn-secondary" onClick={() => { setAction(''); setFrom(''); setTo(''); setPage(1); }}>
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? <Spinner /> : logs.length === 0 ? (
          <EmptyState icon={Shield} title="No audit logs found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Timestamp', 'User', 'Action', 'Entity', 'IP Address', 'Details'].map((h) => (
                      <th key={h} className="table-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="table-td text-xs text-gray-500 whitespace-nowrap">
                        {format(parseISO(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                      </td>
                      <td className="table-td">
                        <div className="font-medium">{log.full_name || '—'}</div>
                        <div className="text-xs text-gray-400">{log.employee_code || 'system'}</div>
                      </td>
                      <td className="table-td">
                        <span className={ACTION_COLORS[log.action] || 'badge-blue'}>{log.action}</span>
                      </td>
                      <td className="table-td text-gray-500">
                        <div>{log.entity_type || '—'}</div>
                        {log.entity_id && (
                          <div className="text-xs text-gray-400 font-mono">{log.entity_id.slice(0, 8)}…</div>
                        )}
                      </td>
                      <td className="table-td text-xs text-gray-500 font-mono">{log.ip_address || '—'}</td>
                      <td className="table-td">
                        {log.new_value ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-primary-600 hover:text-primary-800">View changes</summary>
                            <pre className="text-xs bg-gray-50 rounded p-2 mt-1 max-w-xs overflow-auto max-h-24">
                              {JSON.stringify(
                                typeof log.new_value === 'string' ? JSON.parse(log.new_value) : log.new_value,
                                null, 2
                              )}
                            </pre>
                          </details>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t flex items-center justify-between text-sm text-gray-500">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary py-1 px-3 text-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span className="px-3 py-1 text-xs bg-gray-100 rounded-lg">
                  Page {pagination.page} of {pagination.pages || 1}
                </span>
                <button
                  className="btn-secondary py-1 px-3 text-xs"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (pagination.pages || 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
