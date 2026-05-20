import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './lib/auth.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EquipmentListPage from './pages/EquipmentListPage.jsx';
import EquipmentFormPage from './pages/EquipmentFormPage.jsx';

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
          <Route path="equipamentos/novo" element={<EquipmentFormPage mode="create" />} />
          <Route path="equipamentos/:id/editar" element={<EquipmentFormPage mode="edit" />} />
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

export default App;
