import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, teamApi } from '@/api';
import { PageHeader, Spinner, EmptyState, PctBadge } from '@/components/shared/UI';
import { FileSpreadsheet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdminReports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [teamId, setTeamId] = useState('');
  const [exporting, setExporting] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report', 'admin', 'monthly', year, month, teamId],
    queryFn: () => reportApi.monthly({ year, month, team_id: teamId }).then((r) => r.data.data),
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.list().then((r) => r.data.data),
  });

  const rows = data?.rows || [];
  const totalCompleted = rows.reduce((s, r) => s + r.total_completed, 0);
  const totalTarget = rows.reduce((s, r) => s + (r.monthly_target || 0), 0);
  const orgPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  const downloadFile = async (type) => {
    setExporting(type);
    try {
      const fn = type === 'excel' ? reportApi.exportExcel : reportApi.exportPDF;
      const res = await fn({ year, month, team_id: teamId });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `depms_report_${year}_${String(month).padStart(2,'0')}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch { toast.error('Export failed.'); }
    finally { setExporting(''); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Reports & Analytics"
        actions={
          <div className="flex gap-2">
            <button onClick={() => downloadFile('excel')} disabled={!!exporting}
              className="btn-secondary flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              {exporting === 'excel' ? 'Exporting...' : 'Export Excel'}
            </button>
            <button onClick={() => downloadFile('pdf')} disabled={!!exporting}
              className="btn-secondary flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-red-500" />
              {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div>
          <label className="label">Year</label>
          <select className="input w-28" value={year} onChange={(e) => setYear(+e.target.value)}>
            {[2023,2024,2025,2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Month</label>
          <select className="input w-32" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Team</label>
          <select className="input w-44" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">All Teams</option>
            {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-800">{totalCompleted.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Total Completed</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-800">{totalTarget.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Total Target</div>
          </div>
          <div className="card text-center">
            <div className={`text-2xl font-bold ${orgPct >= 100 ? 'text-green-600' : orgPct >= 60 ? 'text-blue-600' : 'text-yellow-600'}`}>
              {orgPct}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Overall Achievement</div>
          </div>
        </div>
      )}

      {/* Report table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState icon={FileText} title="No data" sub="No entries found for this period" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['#', 'Employee', 'Code', 'Team', 'Days Worked', 'Completed', 'Target', 'Achievement'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={r.user_id} className="hover:bg-gray-50/50">
                    <td className="table-td text-gray-400">{i+1}</td>
                    <td className="table-td font-medium">{r.full_name}</td>
                    <td className="table-td text-gray-500">{r.employee_code}</td>
                    <td className="table-td text-gray-500">{r.team_name || '—'}</td>
                    <td className="table-td">{r.days_worked}</td>
                    <td className="table-td font-semibold">{r.total_completed?.toLocaleString()}</td>
                    <td className="table-td text-gray-500">{r.monthly_target?.toLocaleString() || '—'}</td>
                    <td className="table-td"><PctBadge pct={r.achievement_pct} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t font-semibold">
                <tr>
                  <td colSpan={5} className="table-td">Total</td>
                  <td className="table-td text-primary-700">{totalCompleted.toLocaleString()}</td>
                  <td className="table-td">{totalTarget.toLocaleString()}</td>
                  <td className="table-td"><PctBadge pct={orgPct} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
