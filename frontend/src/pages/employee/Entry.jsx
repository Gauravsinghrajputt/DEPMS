import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hourlyApi } from '@/api';
import { PageHeader, Spinner } from '@/components/shared/UI';
import { Clock, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const SLOTS = [
  { slot: 9,  label: '9–10 AM' },
  { slot: 10, label: '10–11 AM' },
  { slot: 11, label: '11–12 PM' },
  { slot: 12, label: '12–1 PM' },
  { slot: 13, label: '1–2 PM' },
  { slot: 14, label: '2–3 PM' },
  { slot: 15, label: '3–4 PM' },
  { slot: 16, label: '4–5 PM' },
  { slot: 17, label: '5–6 PM' },
  { slot: 18, label: '6–7 PM' },
  { slot: 19, label: '7–8 PM' },
  { slot: 20, label: '8–9 PM' },
];

export default function EmployeeEntry() {
  const qc = useQueryClient();
  const [counts, setCounts] = useState({});
  const currentHour = new Date().getHours();

  const { data, isLoading } = useQuery({
    queryKey: ['hourly', 'today'],
    queryFn: () => hourlyApi.today().then((r) => r.data.data),
    refetchInterval: 60000,
    onSuccess: (d) => {
      const map = {};
      d.slots.forEach((s) => { map[s.hour_slot] = s.count; });
      setCounts(map);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ slot, count }) => hourlyApi.update({ hour_slot: slot, count: parseInt(count) }),
    onSuccess: (_, vars) => {
      toast.success(`${SLOTS.find(s => s.slot === vars.slot)?.label} saved!`);
      qc.invalidateQueries(['hourly', 'today']);
      qc.invalidateQueries(['dashboard', 'employee']);
    },
    onError: () => toast.error('Save failed!'),
  });

  if (isLoading) return <Spinner />;

  const total = data?.total_today || 0;
  const dailyTarget = data?.daily_target || 0;
  const deficit = total - dailyTarget;
  const achievement = dailyTarget > 0 ? Math.min(100, Math.round((total / dailyTarget) * 100)) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <PageHeader
        title="Daily Entry"
        sub={format(new Date(), 'EEEE, dd MMMM yyyy')}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-primary-600">{total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Today</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-gray-700">{dailyTarget}</div>
          <div className="text-xs text-gray-500 mt-1">Daily Target</div>
        </div>
        <div className="card text-center py-4">
          <div className={`text-2xl font-bold ${deficit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {deficit >= 0 ? `+${deficit}` : deficit}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            {deficit >= 0
              ? <TrendingUp className="w-3 h-3 text-green-500" />
              : <TrendingDown className="w-3 h-3 text-red-500" />}
            Deficit
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Today's Progress</span>
          <span className="font-bold text-primary-600">{achievement}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              achievement >= 100 ? 'bg-green-500' :
              achievement >= 60 ? 'bg-primary-500' :
              achievement >= 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, achievement)}%` }}
          />
        </div>
      </div>

      {/* Hourly Slots */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-600" />
          <span className="font-semibold text-gray-700">Hourly Entry</span>
        </div>

        <div className="divide-y divide-gray-50">
          {SLOTS.map((s) => {
            const isPast = s.slot < currentHour;
            const isActive = s.slot === currentHour;
            const isFuture = s.slot > currentHour;
            const savedCount = data?.slots?.find(sl => sl.hour_slot === s.slot)?.count || 0;
            const inputVal = counts[s.slot] !== undefined ? counts[s.slot] : savedCount;

            return (
              <div
                key={s.slot}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                  isActive ? 'bg-primary-50 border-l-4 border-primary-500' :
                  isFuture ? 'opacity-40 bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Time label */}
                <div className="w-20 shrink-0">
                  <span className={`text-sm font-medium ${isActive ? 'text-primary-700' : 'text-gray-600'}`}>
                    {s.label}
                  </span>
                  {isActive && (
                    <div className="text-xs text-primary-500 font-medium">Current</div>
                  )}
                </div>

                {/* Input */}
                <div className="flex-1">
                  {isFuture ? (
                    <div className="h-9 bg-gray-100 rounded-lg flex items-center px-3">
                      <span className="text-gray-400 text-sm">—</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      className={`w-full h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        isActive ? 'border-primary-300 bg-white' : 'border-gray-200 bg-white'
                      }`}
                      placeholder="0"
                      value={inputVal || ''}
                      onChange={(e) => setCounts(prev => ({ ...prev, [s.slot]: e.target.value }))}
                      disabled={isFuture}
                    />
                  )}
                </div>

                {/* Save button / Status */}
                <div className="w-20 shrink-0 flex justify-end">
                  {isFuture ? (
                    <span className="text-xs text-gray-400">Locked</span>
                  ) : (
                    <button
                      onClick={() => updateMut.mutate({ slot: s.slot, count: inputVal || 0 })}
                      disabled={updateMut.isPending}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        savedCount > 0
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                      }`}
                    >
                      {savedCount > 0 ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {savedCount}
                        </span>
                      ) : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total row */}
        <div className="px-5 py-3 bg-gray-50 border-t flex justify-between items-center">
          <span className="font-semibold text-gray-700">Total Today</span>
          <span className="text-xl font-bold text-primary-700">{total}</span>
        </div>
      </div>
    </div>
  );
}