import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api';
import { StatCard, ProgressRing, ProgressBar, Spinner, PageHeader } from '@/components/shared/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Target, CheckCircle2, Clock, TrendingUp, Calendar, Award } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '@/store/authStore';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: () => dashboardApi.employee().then((r) => r.data.data),
    refetchInterval: 120_000,
  });

  if (isLoading) return <Spinner />;

  const w = data?.widgets || {};
  const trend = (data?.week_trend || []).map((d) => ({
    date: format(parseISO(d.entry_date), 'EEE'),
    completed: d.completed_forms,
    target: w.daily_target,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Good ${getGreeting()}, ${user?.full_name?.split(' ')[0]}! 👋`}
        sub={format(new Date(), 'EEEE, dd MMMM yyyy')}
      />

      {/* Top widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monthly Target" value={w.monthly_target?.toLocaleString()} icon={Target} color="blue" />
        <StatCard label="Completed" value={w.total_completed?.toLocaleString()} icon={CheckCircle2} color="green" />
        <StatCard label="Remaining" value={w.remaining?.toLocaleString()} icon={Clock} color="yellow" />
        <StatCard label="Daily Target" value={w.daily_target?.toLocaleString()} icon={Calendar} color="purple" />
      </div>

      {/* Progress section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today progress */}
        <div className="card flex flex-col items-center justify-center gap-3 py-6">
          <ProgressRing pct={w.daily_progress_pct || 0} size={110} stroke={10} />
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{w.today_completed}</div>
            <div className="text-xs text-gray-500">of {w.daily_target} today</div>
            <div className="text-sm font-medium text-gray-600 mt-1">Daily Progress</div>
          </div>
        </div>

        {/* Monthly progress */}
        <div className="card flex flex-col gap-4 justify-center">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Monthly Achievement</span>
            <span className="text-lg font-bold text-primary-600">{w.monthly_achievement_pct || 0}%</span>
          </div>
          <ProgressBar pct={w.monthly_achievement_pct || 0} />
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-bold text-gray-800">{w.total_completed?.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-bold text-gray-800">{w.remaining?.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Remaining</div>
            </div>
          </div>
        </div>

        {/* Productivity score */}
        <div className="card flex flex-col items-center justify-center gap-3 py-6">
          <div className="relative">
            <ProgressRing pct={w.productivity_score || 0} size={110} stroke={10}
              color={w.productivity_score >= 75 ? '#16a34a' : w.productivity_score >= 50 ? '#2563eb' : '#d97706'} />
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600">Productivity Score</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">
                {w.productivity_score >= 80 ? 'Excellent' : w.productivity_score >= 60 ? 'Good' : 'Needs Improvement'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      {trend.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-gray-700">Last 7 Days Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} barSize={28}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <ReferenceLine y={w.daily_target} stroke="#2563eb" strokeDasharray="4 2" label={{ value: 'Target', fontSize: 10, fill: '#2563eb' }} />
              <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                {trend.map((entry, i) => (
                  <Cell key={i} fill={entry.completed >= entry.target ? '#16a34a' : entry.completed >= entry.target * 0.5 ? '#2563eb' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Today's entry status */}
      {data?.today_entry && (
        <div className={`card border-l-4 ${data.today_entry.is_submitted ? 'border-green-500' : 'border-yellow-400'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-700">Today's Entry</p>
              <p className="text-sm text-gray-500 mt-0.5">
                First half: {data.today_entry.first_half_count} &nbsp;|&nbsp;
                Second half: {data.today_entry.second_half_count}
              </p>
            </div>
            <span className={data.today_entry.is_submitted ? 'badge-green' : 'badge-yellow'}>
              {data.today_entry.is_submitted ? '✓ Submitted' : 'In Progress'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
