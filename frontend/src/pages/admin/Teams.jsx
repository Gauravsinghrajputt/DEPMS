// ── admin/Teams.jsx ───────────────────────────────────
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { teamApi, userApi } from '@/api';
import { PageHeader, Modal, Spinner, EmptyState } from '@/components/shared/UI';
import { Building2, Plus, Pencil, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminTeams() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.list().then((r) => r.data.data),
  });
  const { data: leaders } = useQuery({
    queryKey: ['users', 'leaders'],
    queryFn: () => userApi.list({ role: 'team_leader' }).then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => (editTeam ? teamApi.update(editTeam.id, d) : teamApi.create(d)),
    onSuccess: () => {
      toast.success(editTeam ? 'Team updated!' : 'Team created!');
      qc.invalidateQueries(['teams']);
      setModal(false); setEditTeam(null); reset();
    },
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Team Management"
        actions={
          <button onClick={() => { setEditTeam(null); reset({}); setModal(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Team
          </button>
        }
      />

      {isLoading ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams?.map((t) => (
            <div key={t.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{t.name}</h3>
                    <p className="text-xs text-gray-500">{t.member_count} members</p>
                  </div>
                </div>
                <button onClick={() => { setEditTeam(t); reset(t); setModal(true); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
              {t.leader_name && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 pt-2 border-t">
                  <Users className="w-3.5 h-3.5" />Leader: <span className="font-medium text-gray-700">{t.leader_name}</span>
                </div>
              )}
            </div>
          ))}
          {!teams?.length && <EmptyState icon={Building2} title="No teams yet" />}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditTeam(null); reset(); }}
        title={editTeam ? 'Edit Team' : 'Create Team'}>
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Team Name *</label>
            <input className="input" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={2} className="input resize-none" {...register('description')} />
          </div>
          <div>
            <label className="label">Team Leader</label>
            <select className="input" {...register('leader_id')}>
              <option value="">— Select Leader —</option>
              {leaders?.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving...' : (editTeam ? 'Save Changes' : 'Create Team')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
