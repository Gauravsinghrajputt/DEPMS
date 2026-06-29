import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '@/api';
import { PageHeader, Spinner, PctBadge, EmptyState } from '@/components/shared/UI';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeaderReports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ['report', 'monthly', year, month],
    queryFn: () => reportApi.monthly({ year, month }).then((r) => r.data.data),
  });

  const rows = data?.rows || [];

  const downloadFile = async (type) => {
    try {
      const fn = type === 'excel' ? reportApi.exportExcel : reportApi.exportPDF;
      const res = await fn({ year, month });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${year}_${String(month).padStart(2, '0')}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch { toast.error('Export failed.'); }
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Team Reports"
        actions={
          <div className="flex gap-2">
            <button onClick={() => downloadFile('excel')} className="btn-secondary flex items-center gap-1 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
            </button>
            <button onClick={() => downloadFile('pdf')} className="btn-secondary flex items-center gap-1 text-sm">
              <FileText className="w-4 h-4 text-red-500" /> PDF
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div>
          <label className="label">Year</label>
          <select className="input w-28" value={year} onChange={(e) => setYear(+e.target.value)}>
            {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Month</label>
          <select className="input w-32" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Report table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState icon={FileText} title="No report data" sub="No entries found for this period" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['#', 'Employee', 'Code', 'Days Worked', 'Total Completed', 'Target', 'Achievement'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={r.user_id} className="hover:bg-gray-50/50">
                    <td className="table-td text-gray-400">{i + 1}</td>
                    <td className="table-td font-medium">{r.full_name}</td>
                    <td className="table-td text-gray-500">{r.employee_code}</td>
                    <td className="table-td">{r.days_worked}</td>
                    <td className="table-td font-semibold">{r.total_completed?.toLocaleString()}</td>
                    <td className="table-td text-gray-500">{r.monthly_target?.toLocaleString() || '—'}</td>
                    <td className="table-td"><PctBadge pct={r.achievement_pct} /></td>
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
