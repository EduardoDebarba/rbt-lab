import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './lib/auth.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EquipmentListPage from './pages/EquipmentListPage.jsx';
import EquipmentFormPage from './pages/EquipmentFormPage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import LabEquipmentSummaryPage from './pages/LabEquipmentSummaryPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="equipamentos" element={<EquipmentListPage />} />
          <Route path="equipamentos-laboratorio" element={<LabEquipmentSummaryPage />} />
          <Route path="vendas" element={<SalesPage />} />
          <Route
            path="usuarios"
            element={
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="equipamentos/novo"
            element={
              <AdminRoute>
                <EquipmentFormPage mode="create" />
              </AdminRoute>
            }
          />
          <Route
            path="equipamentos/:id/editar"
            element={
              <AdminRoute>
                <EquipmentFormPage mode="edit" />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.perfil === 'ADMIN' ? children : <Navigate to="/equipamentos" replace />;
}

export default App;
