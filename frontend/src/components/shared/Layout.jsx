import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  BarChart3, Home, ClipboardList, History, Users, Target,
  FileText, Settings, LogOut, Bell, Menu, X, ChevronDown,
  Shield, Building2, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authApi, notifApi } from '@/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const NAV = {
  employee: [
    { to: '/employee', icon: Home, label: 'Dashboard', end: true },
    { to: '/employee/entry', icon: ClipboardList, label: 'Daily Entry' },
    { to: '/employee/history', icon: History, label: 'My History' },
    { to: '/employee/profile', icon: Settings, label: 'Profile' },
  ],
  team_leader: [
    { to: '/leader', icon: Home, label: 'Dashboard', end: true },
    { to: '/leader/team', icon: Users, label: 'My Team' },
    { to: '/leader/reports', icon: FileText, label: 'Reports' },
  ],
  admin: [
    { to: '/admin', icon: Home, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: Users, label: 'Employees' },
    { to: '/admin/teams', icon: Building2, label: 'Teams' },
    { to: '/admin/targets', icon: Target, label: 'Targets' },
    { to: '/admin/reports', icon: FileText, label: 'Reports' },
    { to: '/admin/audit', icon: Shield, label: 'Audit Logs' },
  ],
};

const ROLE_LABEL = { admin: 'Administrator', team_leader: 'Team Leader', employee: 'Employee' };
const ROLE_COLOR = { admin: 'badge-red', team_leader: 'badge-yellow', employee: 'badge-blue' };

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = NAV[user?.role] || [];

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifApi.list().then((r) => r.data.data),
    refetchInterval: 60_000,
  });
  const unread = notifData?.filter((n) => !n.is_read).length || 0;

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => { logout(); navigate('/login'); },
    onError: () => { logout(); navigate('/login'); },
  });

  const Sidebar = ({ mobile }) => (
    <aside className={clsx(
      'flex flex-col h-full bg-brand',
      mobile ? 'w-64' : 'w-64 hidden lg:flex'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm">DEPMS</div>
          <div className="text-primary-200 text-xs">Performance System</div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-400 flex items-center justify-center text-white font-semibold text-sm">
            {user?.full_name?.[0]}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.full_name}</div>
            <span className={clsx('text-xs', ROLE_COLOR[user?.role])}>
              {ROLE_LABEL[user?.role]}
            </span>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-white/20 text-white'
                : 'text-primary-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => logoutMutation.mutate()}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-primary-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                  {user?.full_name?.[0]}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.full_name}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-3 py-2 border-b">
                    <div className="text-xs text-gray-500">{user?.employee_code}</div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => { logoutMutation.mutate(); setProfileOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
