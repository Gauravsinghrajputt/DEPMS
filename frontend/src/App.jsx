import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Pages
import LoginPage from '@/pages/LoginPage';
import EmployeeDashboard from '@/pages/employee/Dashboard';
import EmployeeEntry from '@/pages/employee/Entry';
import EmployeeHistory from '@/pages/employee/History';
import EmployeeProfile from '@/pages/employee/Profile';

import LeaderDashboard from '@/pages/leader/Dashboard';
import LeaderTeam from '@/pages/leader/Team';
import LeaderReports from '@/pages/leader/Reports';

import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminTeams from '@/pages/admin/Teams';
import AdminTargets from '@/pages/admin/Targets';
import AdminReports from '@/pages/admin/Reports';
import AdminAuditLogs from '@/pages/admin/AuditLogs';

import PWAInstallPrompt from '@/PWAInstallPrompt';
import Layout from '@/components/shared/Layout';
import NotFound from '@/pages/NotFound';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'team_leader') return <Navigate to="/leader" replace />;
  return <Navigate to="/employee" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <PWAInstallPrompt />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />

        {/* Employee routes */}
        <Route path="/employee" element={<ProtectedRoute roles={['employee']}><Layout /></ProtectedRoute>}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="entry" element={<EmployeeEntry />} />
          <Route path="history" element={<EmployeeHistory />} />
          <Route path="profile" element={<EmployeeProfile />} />
        </Route>

        {/* Team Leader routes */}
        <Route path="/leader" element={<ProtectedRoute roles={['team_leader']}><Layout /></ProtectedRoute>}>
          <Route index element={<LeaderDashboard />} />
          <Route path="team" element={<LeaderTeam />} />
          <Route path="reports" element={<LeaderReports />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="targets" element={<AdminTargets />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="audit" element={<AdminAuditLogs />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

