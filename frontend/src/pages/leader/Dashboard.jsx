import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api';
import { StatCard, ProgressBar, PctBadge, Spinner, PageHeader } from '@/components/shared/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Target, CheckCircle2, TrendingUp, UserCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function LeaderDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'leader'],
    queryFn: () => dashboardApi.leader().then((r) => r.data.data),
    refetchInterval: 180_000,
  });

  if (isLoading) return <Spinner />;

  const s = data?.team_summary || {};
  const members = data?.members || [];
  const trend = (data?.week_trend || []).map((d) => ({
    date: format(parseISO(d.entry_date), 'EEE dd'),
    total: parseInt(d.total),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Team Dashboard"
        sub={format(new Date(), 'EEEE, dd MMMM yyyy')}
      />

      {/* Summary widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Team Members" value={s.total_members} icon={Users} color="blue" />
        <StatCard label="Present Today" value={s.present_today} icon={UserCheck} color="green" />
        <StatCard label="Submitted Today" value={s.submitted_today} icon={CheckCircle2} color="purple" />
        <StatCard label="Team Achievement" value={`${s.team_achievement_pct || 0}%`} icon={TrendingUp} color="yellow" />
      </div>

      {/* Team MTD progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Team Monthly Progress</h3>
          <span className="text-lg font-bold text-primary-600">{s.team_achievement_pct || 0}%</span>
        </div>
        <ProgressBar pct={s.team_achievement_pct || 0} className="mb-3" />
        <div className="flex justify-between text-sm text-gray-500">
          <span>Completed: <strong className="text-gray-800">{s.team_monthly_completed?.toLocaleString()}</strong></span>
          <span>Target: <strong className="text-gray-800">{s.team_monthly_target?.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Team member table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-gray-700">Employee Performance — Today</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Employee', 'Today', 'Daily Target', 'MTD', 'Monthly Target', 'Achievement', 'Attendance', 'Status'].map((h) => (
                  <th key={h} className="table-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="table-td">
                    <div className="font-medium">{m.full_name}</div>
                    <div className="text-xs text-gray-400">{m.employee_code}</div>
                  </td>
                  <td className="table-td font-semibold">{m.today_completed}</td>
                  <td className="table-td text-gray-500">{m.daily_target}</td>
                  <td className="table-td font-semibold">{m.monthly_completed?.toLocaleString()}</td>
                  <td className="table-td text-gray-500">{m.monthly_target?.toLocaleString()}</td>
                  <td className="table-td"><PctBadge pct={m.achievement_pct} /></td>
                  <td className="table-td">
                    <span className={
                      m.attendance_status === 'present' ? 'badge-green' :
                      m.attendance_status === 'half_day' ? 'badge-yellow' : 'badge-red'
                    }>{m.attendance_status || 'absent'}</span>
                  </td>
                  <td className="table-td">
                    <span className={m.is_submitted ? 'badge-green' : 'badge-yellow'}>
                      {m.is_submitted ? 'Submitted' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend chart */}
      {trend.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Team Weekly Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} barSize={32}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} name="Total Forms" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
