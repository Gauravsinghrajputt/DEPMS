import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entryApi } from '@/api';
import { PageHeader, Spinner, PctBadge, EmptyState } from '@/components/shared/UI';
import { format, parseISO } from 'date-fns';
import { History } from 'lucide-react';

export default function EmployeeHistory() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['entry', 'history', from, to],
    queryFn: () => entryApi.history({ from, to }).then((r) => r.data.data),
  });

  const entries = data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="My Entry History" sub="View all your past daily entries" />

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button className="btn-secondary" onClick={() => { setFrom(''); setTo(''); }}>Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? <Spinner /> : entries.length === 0 ? (
          <EmptyState icon={History} title="No entries found" sub="Your entry history will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date', 'First Half', 'Second Half', 'Total', 'Achievement', 'Status'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-medium">
                      {format(parseISO(e.entry_date), 'dd MMM yyyy')}
                      <span className="block text-xs text-gray-400">{format(parseISO(e.entry_date), 'EEEE')}</span>
                    </td>
                    <td className="table-td">{e.first_half_count}</td>
                    <td className="table-td">{e.second_half_count}</td>
                    <td className="table-td font-semibold">{e.completed_forms}</td>
                    <td className="table-td">—</td>
                    <td className="table-td">
                      <span className={e.is_submitted ? 'badge-green' : 'badge-yellow'}>
                        {e.is_submitted ? 'Submitted' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
