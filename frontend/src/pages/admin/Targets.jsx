import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { targetApi, userApi, teamApi } from '@/api';
import { PageHeader, Spinner, Modal, EmptyState, PctBadge } from '@/components/shared/UI';
import { Target, Plus, Pencil, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminTargets() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [indivModal, setIndivModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { register: regI, handleSubmit: hsI, reset: resetI } = useForm();
  const { register: regB, handleSubmit: hsB, reset: resetB } = useForm();
  const { register: regE, handleSubmit: hsE, reset: resetE } = useForm();

  const { data: targets, isLoading } = useQuery({
    queryKey: ['targets', year, month],
    queryFn: () => targetApi.list({ year, month }).then((r) => r.data.data),
  });
  const { data: users } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.list({ role: 'employee' }).then((r) => r.data.data),
  });
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.list().then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => targetApi.create({ ...d, year, month, monthly_target: +d.monthly_target }),
    onSuccess: () => { toast.success('Target created!'); qc.invalidateQueries(['targets']); setIndivModal(false); resetI(); },
  });

  const bulkMut = useMutation({
    mutationFn: (d) => targetApi.bulkTeam({ ...d, year, month, monthly_target: +d.monthly_target }),
    onSuccess: (r) => { toast.success(r.data.message); qc.invalidateQueries(['targets']); setBulkModal(false); resetB(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => targetApi.update(id, { monthly_target: +d.monthly_target }),
    onSuccess: () => { toast.success('Target updated!'); qc.invalidateQueries(['targets']); setEditTarget(null); },
  });

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Target Management"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setBulkModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" /> Bulk Assign Team
            </button>
            <button onClick={() => setIndivModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Assign Individual
            </button>
          </div>
        }
      />

      {/* Month/Year filter */}
      <div className="card flex gap-3 flex-wrap">
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
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? <Spinner /> : !targets?.length ? (
          <EmptyState icon={Target} title="No targets set" sub="Assign targets to employees for this month" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Employee', 'Code', 'Team', 'Monthly Target', 'Daily Target', 'Working Days', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {targets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-medium">{t.full_name}</td>
                    <td className="table-td text-gray-500">{t.employee_code}</td>
                    <td className="table-td text-gray-500">{t.team_name || '—'}</td>
                    <td className="table-td font-semibold">{t.monthly_target?.toLocaleString()}</td>
                    <td className="table-td">{t.daily_target}</td>
                    <td className="table-td">{t.working_days}</td>
                    <td className="table-td">
                      <button onClick={() => { setEditTarget(t); resetE({ monthly_target: t.monthly_target }); }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual assign modal */}
      <Modal open={indivModal} onClose={() => setIndivModal(false)} title="Assign Individual Target">
        <form onSubmit={hsI((d) => createMut.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Employee *</label>
            <select className="input" {...regI('user_id', { required: true })}>
              <option value="">— Select Employee —</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.employee_code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monthly Target *</label>
              <input type="number" min="1" className="input" {...regI('monthly_target', { required: true })} />
            </div>
            <div>
              <label className="label">Working Days</label>
              <input type="number" min="1" max="31" className="input" placeholder="Auto" {...regI('working_days')} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Daily target = Monthly ÷ Working Days (auto-calculated)</p>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setIndivModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Assigning...' : 'Assign Target'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk team assign modal */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Assign Team Targets">
        <form onSubmit={hsB((d) => bulkMut.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Team *</label>
            <select className="input" {...regB('team_id', { required: true })}>
              <option value="">— Select Team —</option>
              {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monthly Target (per employee) *</label>
              <input type="number" min="1" className="input" {...regB('monthly_target', { required: true })} />
            </div>
            <div>
              <label className="label">Working Days</label>
              <input type="number" min="1" max="31" className="input" placeholder="Auto" {...regB('working_days')} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Same target will be assigned to all active team members. Existing targets are skipped.</p>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setBulkModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={bulkMut.isPending}>
              {bulkMut.isPending ? 'Assigning...' : 'Assign to Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Target Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Target" size="sm">
        <form onSubmit={hsE((d) => updateMut.mutate({ id: editTarget?.id, ...d }))} className="space-y-4">
          <p className="text-sm text-gray-600">Employee: <strong>{editTarget?.full_name}</strong></p>
          <div>
            <label className="label">New Monthly Target</label>
            <input type="number" min="1" className="input" {...regE('monthly_target', { required: true })} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Updating...' : 'Update Target'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
