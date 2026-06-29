// ── leader/Team.jsx ───────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { userApi, entryApi } from '@/api';
import { PageHeader, Spinner, EmptyState, PctBadge } from '@/components/shared/UI';
import { Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function LeaderTeam() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'team'],
    queryFn: () => userApi.list({ role: 'employee' }).then((r) => r.data.data),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="My Team" sub="All employees in your team" />
      <div className="card p-0 overflow-hidden">
        {isLoading ? <Spinner /> : !users?.length ? (
          <EmptyState icon={Users} title="No team members" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Employee', 'Code', 'Email', 'Status', 'Last Login'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-medium">{u.full_name}</td>
                    <td className="table-td text-gray-500">{u.employee_code}</td>
                    <td className="table-td text-gray-500">{u.email}</td>
                    <td className="table-td">
                      <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td text-gray-500">
                      {u.last_login ? format(parseISO(u.last_login), 'dd MMM, HH:mm') : '—'}
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
