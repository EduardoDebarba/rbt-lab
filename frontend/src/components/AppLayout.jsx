import { BarChart3, Boxes, ClipboardList, DollarSign, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import logoRbt from '../assets/logo-rbt-branco.png';
import { useAuth } from '../lib/auth.jsx';
import { useThemeMode } from '../lib/theme.js';

function AppLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-700 bg-slate-800 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-16 items-center justify-center overflow-hidden">
              <img className="h-12 w-16 object-contain" src={logoRbt} alt="RBT Internet" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-white">RBT Lab</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `btn ${isActive ? 'btn-header-active' : 'btn-header'}`
              }
            >
              <BarChart3 size={16} aria-hidden="true" />
              Dashboard
            </NavLink>
            <NavLink
              to="/equipamentos"
              className={({ isActive }) =>
                `btn ${isActive ? 'btn-header-active' : 'btn-header'}`
              }
            >
              <Boxes size={16} aria-hidden="true" />
              Equipamentos
            </NavLink>
            <NavLink
              to="/equipamentos-laboratorio"
              className={({ isActive }) =>
                `btn ${isActive ? 'btn-header-active' : 'btn-header'}`
              }
            >
              <ClipboardList size={16} aria-hidden="true" />
              Laboratório
            </NavLink>
            <NavLink
              to="/vendas"
              className={({ isActive }) =>
                `btn ${isActive ? 'btn-header-active' : 'btn-header'}`
              }
            >
              <DollarSign size={16} aria-hidden="true" />
              Vendas
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user?.nome}</p>
              <p className="text-xs text-slate-300">{user?.perfil}</p>
            </div>
            <button
              className="btn btn-header h-10 w-10 px-0"
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            </button>
            {user?.perfil === 'ADMIN' && (
              <NavLink
                className={({ isActive }) =>
                  `btn h-10 w-10 px-0 ${isActive ? 'btn-header-active' : 'btn-header'}`
                }
                to="/usuarios"
                title="Gerenciar usuários"
                aria-label="Gerenciar usuários"
              >
                <Settings size={16} aria-hidden="true" />
              </NavLink>
            )}
            <button className="btn btn-header" type="button" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-5 pt-24">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
