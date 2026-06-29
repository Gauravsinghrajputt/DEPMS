import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entryApi } from '@/api';
import { Spinner, PageHeader, ProgressBar, ProgressRing } from '@/components/shared/UI';
import { CheckCircle2, Clock, Sun, Sunset, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function EmployeeEntry() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const [firstHalf, setFirstHalf] = useState('');
  const [secondHalf, setSecondHalf] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['entry', 'today'],
    queryFn: () => entryApi.today().then((r) => r.data.data),
    onSuccess: (d) => {
      setFirstHalf(String(d.entry?.first_half_count || ''));
      setSecondHalf(String(d.entry?.second_half_count || ''));
    },
  });

  const invalidate = () => {
    qc.invalidateQueries(['entry', 'today']);
    qc.invalidateQueries(['dashboard', 'employee']);
  };

  const fhMutation = useMutation({
    mutationFn: (count) => entryApi.updateFirstHalf({ count: parseInt(count) }),
    onSuccess: (r) => { toast.success('First half saved!'); invalidate(); },
  });

  const shMutation = useMutation({
    mutationFn: (count) => entryApi.updateSecondHalf({ count: parseInt(count) }),
    onSuccess: () => { toast.success('Second half saved!'); invalidate(); },
  });

  const submitMutation = useMutation({
    mutationFn: () => entryApi.submit({ notes }),
    onSuccess: () => { toast.success('Day submitted successfully! 🎉'); invalidate(); },
  });

  if (isLoading) return <Spinner />;

  const entry = data?.entry;
  const stats = data?.stats;
  const submitted = entry?.is_submitted;

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <PageHeader
        title="Daily Entry"
        sub={format(new Date(), 'EEEE, dd MMMM yyyy')}
      />

      {/* Status bar */}
      <div className={`card border-l-4 flex items-center justify-between ${submitted ? 'border-green-500 bg-green-50' : 'border-yellow-400 bg-yellow-50'}`}>
        <div className="flex items-center gap-2">
          {submitted ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-yellow-600" />}
          <span className="font-medium text-sm">{submitted ? 'Day Submitted' : 'Entry In Progress'}</span>
        </div>
        {submitted && entry.submitted_at && (
          <span className="text-xs text-gray-500">Submitted at {entry.submitted_at}</span>
        )}
      </div>

      {/* Progress widgets */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card flex flex-col items-center gap-2 py-4">
            <ProgressRing pct={stats.daily_progress_pct} size={90} stroke={8} />
            <p className="text-xs text-gray-500 font-medium">Today's Progress</p>
            <p className="text-sm text-gray-600">{stats.today_completed} / {stats.daily_target}</p>
          </div>
          <div className="card flex flex-col gap-3 justify-center">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Monthly</span>
              <span className="font-semibold text-primary-600">{stats.monthly_achievement_pct}%</span>
            </div>
            <ProgressBar pct={stats.monthly_achievement_pct} />
            <div className="text-xs text-gray-500 space-y-0.5">
              <div className="flex justify-between"><span>Remaining</span><span className="font-medium text-gray-700">{stats.monthly_remaining?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Required daily avg</span><span className="font-medium text-gray-700">{stats.required_daily_avg}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* First Half Entry */}
      <div className={`card ${submitted ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-700">First Half (Before Lunch)</h3>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="label">Forms Completed</label>
            <input
              type="number" min="0"
              className="input"
              placeholder="0"
              value={firstHalf}
              onChange={(e) => setFirstHalf(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            onClick={() => fhMutation.mutate(firstHalf)}
            disabled={fhMutation.isPending || !firstHalf}
          >
            {fhMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Second Half Entry */}
      <div className={`card ${submitted ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <Sunset className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-gray-700">Second Half (After Lunch)</h3>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="label">Forms Completed</label>
            <input
              type="number" min="0"
              className="input"
              placeholder="0"
              value={secondHalf}
              onChange={(e) => setSecondHalf(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            onClick={() => shMutation.mutate(secondHalf)}
            disabled={shMutation.isPending || !secondHalf}
          >
            {shMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Total summary */}
      {entry && (
        <div className="card bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-3">Today's Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{entry.first_half_count || 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">First Half</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{entry.second_half_count || 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">Second Half</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{entry.completed_forms || 0}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* End of day submit */}
      {!submitted && (
        <div className="card border border-dashed border-gray-300">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600">
              Submitting will lock today's entry. Make sure both halves are updated before submitting.
            </p>
          </div>
          <div className="mb-3">
            <label className="label">Notes (optional)</label>
            <textarea
              rows={2}
              className="input resize-none"
              placeholder="Any remarks for today..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            className="btn-primary w-full flex items-center justify-center gap-2"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            <Send className="w-4 h-4" />
            {submitMutation.isPending ? 'Submitting...' : 'Submit End of Day'}
          </button>
        </div>
      )}
    </div>
  );
}
