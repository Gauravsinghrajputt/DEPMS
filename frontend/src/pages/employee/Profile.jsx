import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { authApi } from '@/api';
import { PageHeader, Modal } from '@/components/shared/UI';
import { useAuthStore } from '@/store/authStore';
import { User, KeyRound, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmployeeProfile() {
  const { user } = useAuthStore();
  const [pwModal, setPwModal] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const pwMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => { toast.success('Password changed!'); setPwModal(false); reset(); },
  });

  const ROLE_LABEL = { admin: 'Administrator', team_leader: 'Team Leader', employee: 'Employee' };

  return (
    <div className="max-w-xl space-y-5 animate-fade-in">
      <PageHeader title="My Profile" />

      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-700">{user?.full_name?.[0]}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{user?.full_name}</h2>
            <p className="text-sm text-gray-500">{ROLE_LABEL[user?.role]}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div><p className="text-xs text-gray-500">Employee Code</p><p className="font-medium">{user?.employee_code}</p></div>
          <div><p className="text-xs text-gray-500">Email</p><p className="font-medium text-sm">{user?.email}</p></div>
          <div><p className="text-xs text-gray-500">Role</p><p className="font-medium">{ROLE_LABEL[user?.role]}</p></div>
          <div><p className="text-xs text-gray-500">Team ID</p><p className="font-medium text-sm">{user?.team_id || '—'}</p></div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Security</h3>
        <button onClick={() => setPwModal(true)} className="btn-secondary flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Change Password
        </button>
      </div>

      <Modal open={pwModal} onClose={() => setPwModal(false)} title="Change Password">
        <form onSubmit={handleSubmit((d) => pwMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" {...register('current_password', { required: true })} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" {...register('new_password', { required: true, minLength: 8 })} />
            {errors.new_password && <p className="text-red-500 text-xs mt-1">Min 8 characters</p>}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setPwModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={pwMutation.isPending}>
              {pwMutation.isPending ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
