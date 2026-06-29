import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api';
import { StatCard, Spinner, PageHeader, ProgressBar } from '@/components/shared/UI';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { Users, Building2, Target, TrendingUp, Award, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => dashboardApi.admin().then((r) => r.data.data),
    refetchInterval: 300_000,
  });

  if (isLoading) return <Spinner />;

  const w = data?.widgets || {};
  const teamPerf = (data?.team_performance || []).map((t) => ({
    name: t.name?.length > 12 ? t.name.slice(0, 12) + '…' : t.name,
    completed: parseInt(t.completed),
  }));
  const monthTrend = (data?.monthly_trend || []).map((m) => ({
    month: format(parseISO(m.month), 'MMM yy'),
    total: parseInt(m.total),
  }));
  const leaderboard = data?.leaderboard || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Organization Dashboard"
        sub={format(new Date(), 'EEEE, dd MMMM yyyy')}
      />

      {/* Top widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Employees" value={w.total_employees} icon={Users} color="blue" />
        <StatCard label="Teams" value={w.total_teams} icon={Building2} color="purple" />
        <StatCard label="Org Target" value={w.org_monthly_target?.toLocaleString()} icon={Target} color="yellow" />
        <StatCard label="Org Completed" value={w.org_monthly_completed?.toLocaleString()} icon={CheckCircle2} color="green" />
        <StatCard label="Achievement" value={`${w.org_achievement_pct || 0}%`} icon={TrendingUp} color="green" />
        <StatCard label="Submitted Today" value={w.submitted_today} icon={CheckCircle2} color="blue" />
      </div>

      {/* Org progress bar */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-gray-700">Organization Monthly Progress</span>
          <span className="text-xl font-bold text-primary-600">{w.org_achievement_pct || 0}%</span>
        </div>
        <ProgressBar pct={w.org_achievement_pct || 0} />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Completed: {w.org_monthly_completed?.toLocaleString()}</span>
          <span>Target: {w.org_monthly_target?.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Team performance chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Team Performance (MTD)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={teamPerf} layout="vertical" barSize={18}>
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
              <Bar dataKey="completed" fill="#2563eb" radius={[0, 4, 4, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly trend */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">6-Month Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} name="Total Forms" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-gray-700">Top 10 Performers — This Month</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Rank', 'Employee', 'Code', 'Team', 'Total Completed'].map((h) => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaderboard.map((u, i) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="table-td">
                    <span className={`font-bold text-lg ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}
                    </span>
                  </td>
                  <td className="table-td font-medium">{u.full_name}</td>
                  <td className="table-td text-gray-500">{u.employee_code}</td>
                  <td className="table-td text-gray-500">{u.team_name || '—'}</td>
                  <td className="table-td font-bold text-primary-600">{parseInt(u.total)?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
