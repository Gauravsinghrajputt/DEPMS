import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { userApi, teamApi } from '@/api';
import { PageHeader, Spinner, Modal, EmptyState } from '@/components/shared/UI';
import { Users, Plus, Pencil, Trash2, KeyRound, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => userApi.list({ search, role: roleFilter }).then((r) => r.data.data),
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.list().then((r) => r.data.data),
  });

  const { register: regCreate, handleSubmit: hsCreate, reset: resetCreate } = useForm();
  const { register: regEdit, handleSubmit: hsEdit, reset: resetEdit } = useForm();
  const { register: regReset, handleSubmit: hsReset, reset: resetResetForm } = useForm();

  const createMut = useMutation({
    mutationFn: (d) => userApi.create(d),
    onSuccess: () => {
      toast.success('Employee created!');
      qc.invalidateQueries(['users']);
      setCreateModal(false);
      resetCreate();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => userApi.update(id, d),
    onSuccess: () => {
      toast.success('Employee updated!');
      qc.invalidateQueries(['users']);
      setEditUser(null);
    },
  });

  const deactivateMut = useMutation({
    mutationFn: (id) => userApi.delete(id),
    onSuccess: () => { toast.success('Employee deactivated!'); qc.invalidateQueries(['users']); },
  });

  const resetPwMut = useMutation({
    mutationFn: ({ id, new_password }) => userApi.resetPassword(id, { new_password }),
    onSuccess: () => { toast.success('Password reset!'); setResetUser(null); resetResetForm(); },
  });

  const ROLES = [
    { value: 'employee', label: 'Employee' },
    { value: 'team_leader', label: 'Team Leader' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Employee Management"
        sub="Create and manage all employees"
        actions={
          <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        }
      />

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400" />
          <input className="outline-none text-sm flex-1" placeholder="Search name or code..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? <Spinner /> : !data?.length ? (
          <EmptyState icon={Users} title="No employees found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Employee', 'Code', 'Email', 'Role', 'Team', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-medium">{u.full_name}</td>
                    <td className="table-td text-gray-500">{u.employee_code}</td>
                    <td className="table-td text-gray-500 text-xs">{u.email}</td>
                    <td className="table-td">
                      <span className={u.role === 'admin' ? 'badge-red' : u.role === 'team_leader' ? 'badge-yellow' : 'badge-blue'}>
                        {u.role}
                      </span>
                    </td>
                    <td className="table-td text-gray-500">{u.team_name || '—'}</td>
                    <td className="table-td">
                      <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td text-gray-500 text-xs">
                      {format(parseISO(u.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditUser(u); resetEdit(u); }}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setResetUser(u)}
                          className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600 transition-colors" title="Reset Password">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {u.is_active && (
                          <button onClick={() => { if (confirm(`Deactivate ${u.full_name}?`)) deactivateMut.mutate(u.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Deactivate">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add New Employee">
        <form onSubmit={hsCreate((d) => createMut.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" {...regCreate('full_name', { required: true })} />
            </div>
            <div>
              <label className="label">Employee Code *</label>
              <input className="input uppercase" {...regCreate('employee_code', { required: true })} />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" {...regCreate('email', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" {...regCreate('password', { required: true, minLength: 8 })} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" {...regCreate('role', { required: true })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Team</label>
            <select className="input" {...regCreate('team_id')}>
              <option value="">— No Team —</option>
              {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit Employee">
        <form onSubmit={hsEdit((d) => updateMut.mutate({ id: editUser?.id, ...d }))} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" {...regEdit('full_name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select className="input" {...regEdit('role')}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Team</label>
              <select className="input" {...regEdit('team_id')}>
                <option value="">— No Team —</option>
                {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...regEdit('is_active')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setEditUser(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password — ${resetUser?.full_name}`} size="sm">
        <form onSubmit={hsReset((d) => resetPwMut.mutate({ id: resetUser?.id, ...d }))} className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" {...regReset('new_password', { required: true, minLength: 8 })} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setResetUser(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={resetPwMut.isPending}>
              {resetPwMut.isPending ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
